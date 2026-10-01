/**
 * Claude Code agent-loop alignment for the DeepSeek Harness.
 *
 * This plugin layers Claude Code's loop behavior onto DSH's existing
 * extension points, without touching the loop kernel:
 *
 * - `maxToolTurns` — a per-turn tool-use budget (Claude Code `max_turns`
 *   analog). DSH documents "no built-in turn budget"; this enforces one at
 *   the `agent/pre-step` waterfall: once the cap is reached, one grace step
 *   runs with an injected stop instruction; a model that still calls tools
 *   has the following step rejected and the turn closes.
 * - `snipAtRatio` — a cheap per-turn "snip" pass: when the routed model's
 *   context pressure exceeds the configured ratio, the optional
 *   `toolResultPruner` prunes oversized tool results (silently no-ops without
 *   that sibling service). Plus a model-driven `snip` tool that replaces the
 *   oldest history with one placeholder (Claude Code SnipTool analog).
 * - `compactAtRatio` — pressure compaction through `ctx.compaction`. Keep at
 *   0 when `dsh-compaction-basic` runs with `auto: true` (it already checks
 *   exactly this seam itself).
 * - `turnTokenBudget` — Claude Code `TOKEN_BUDGET` analog: steer the model to
 *   keep working up to a token target, stopping at completion ratio or
 *   diminishing returns.
 * - `maxTokensRecoveryLimit` — Claude Code `max_output_tokens` recovery:
 *   steer a resume message after a `max-tokens` finish, up to the limit.
 * - `plan_agent` — a read-only software-architect subagent tool (Claude Code
 *   PLAN_AGENT analog) gated on a subagent provider with `toolFilter`
 *   capability, so the child can only read.
 *
 * Every optional service is read through `ctx.get()` with an undefined
 * check — the plugin degrades gracefully and can never break the loop.
 *
 * @module @deepseek-ai/dsh-claude-loop-alignment
 */

import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Agent, PreStepDecision } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, UserMessage } from '@deepseek-ai/dsh-llm'
import type { LlmRuntime } from '@deepseek-ai/dsh-llm'
import type { Session } from '@deepseek-ai/dsh-session'
import type { CompactionEngine, CompactionTrigger } from '@deepseek-ai/dsh-compaction'
import type { ToolResultPruner } from '@deepseek-ai/dsh-compaction-tool-result-pruner'
import type { TokenMeter } from '@deepseek-ai/dsh-token-meter'
import type { SubagentRuntime } from '@deepseek-ai/dsh-subagent'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'

/** Plugin name, also the message source tag. */
export const name = 'claude-loop-alignment'

/** Runtime configuration of the claude-loop-alignment plugin. */
export interface ClaudeLoopAlignmentConfig {
  /** Max tool-use steps allowed per user turn; 0 disables the budget. */
  maxToolTurns: number
  /** Prune tool-result surface once measured pressure exceeds this ratio of the routed model's context window. */
  snipAtRatio: number
  /** Call ctx.compaction.compactIfNeeded at the same pressure point; keep 0 when compaction-basic runs with auto:true. */
  compactAtRatio: number
  /** Claude Code TOKEN_BUDGET analog (output tokens per turn); 0 disables. */
  turnTokenBudget: number
  /** Fraction of the token target where continuation nudges stop and the turn completes. */
  budgetCompletionRatio: number
  /** Output-token delta below which continuation is judged diminishing. */
  budgetDiminishingDelta: number
  /** Max consecutive max-tokens resume steers per session; 0 disables recovery. */
  maxTokensRecoveryLimit: number
  /** Optional model override for the plan subagent (null = inherit). */
  planAgentModel: string | null
}

export const Config: z<ClaudeLoopAlignmentConfig> = z.object({
  maxToolTurns: z.number().step(1).min(0).default(20),
  snipAtRatio: z.number().min(0).max(1).default(0.6),
  compactAtRatio: z.number().min(0).max(1).default(0),
  turnTokenBudget: z.number().step(1).min(0).default(0),
  budgetCompletionRatio: z.number().min(0).max(1).default(0.9),
  budgetDiminishingDelta: z.number().step(1).min(0).default(500),
  maxTokensRecoveryLimit: z.number().step(1).min(0).default(3),
  planAgentModel: z.union([z.string(), z.const(null)]).default(null),
})

/** No hard service dependency: every capability is optional and degrades. */
export const inject: string[] = []

const PLUGIN = 'claude-loop-alignment'
const STOP_PAYLOAD =
  '[turn budget] The configured maximum tool-use steps for this turn have been reached. '
  + 'Do not call any more tools. Give the final answer now, based on the tool results already available.'
const BUDGET_NUDGE = (pct: number, used: number, budget: number): string =>
  `Stopped at ${pct}% of token target (${used.toLocaleString('en-US')} / ${budget.toLocaleString('en-US')}). Keep working \u2014 do not summarize.`
const MAX_TOKENS_RESUME =
  'Output token limit hit. Resume directly \u2014 no apology, no recap of what you were doing. '
  + 'Pick up mid-thought if that is where the cut happened. Break remaining work into smaller pieces.'

/** One identified user-role steering/stop message owned by this plugin. */
function userMessage(text: string): UserMessage {
  return createUserMessage({
    content: [{ type: 'text', text }],
    source: { kind: 'plugin', plugin: PLUGIN },
  })
}

/** Tool-use step count for one turn, read from the durable session log. */
function toolStepCount(session: Session, turn: number): number {
  let count = 0
  for (const event of session.events) {
    if (event.type !== 'assistant/message') continue
    if (event.data.turn !== turn) continue
    for (const block of event.data.message.content) {
      if (block.type === 'tool-call') {
        count += 1
        break
      }
    }
  }
  return count
}

/** Output tokens spent in one turn, read from durable usage records. */
function turnOutputTokens(session: Session, turn: number): number {
  let total = 0
  for (const event of session.events) {
    if (event.type !== 'assistant/message') continue
    if (event.data.turn !== turn) continue
    const usage = event.data.usage
    if (usage !== undefined && typeof usage.outputTokens === 'number') total += usage.outputTokens
  }
  return total
}

/** The stop reason of the most recent finish chunk, if any. */
function lastFinishKind(session: Session): string | undefined {
  for (let index = session.events.length - 1; index >= 0; index -= 1) {
    const event = session.events[index]
    if (event === undefined || event.type !== 'assistant/chunk') continue
    const chunk = event.data.chunk
    if (chunk.type === 'finish') return chunk.reason.kind
  }
  return undefined
}

/** Context pressure ratio (used tokens / routed context window), or undefined when unmeasurable. */
async function measureRatio(
  ctx: Context,
  agent: Agent,
  signal: AbortSignal,
): Promise<number | undefined> {
  const header = agent.session.requestHeader()
  if (header === undefined) return undefined
  const route = header.config
  if (route.provider.length === 0 || route.model.length === 0) return undefined
  const meter: TokenMeter | undefined = ctx.get('tokenMeter')
  const llm: LlmRuntime | undefined = ctx.get('llm')
  if (meter === undefined || llm === undefined) return undefined
  let contextWindow: number | undefined
  try {
    const info = await llm.resolveModelInfo(route.provider, route.model, signal)
    contextWindow = info.context?.contextWindow
  } catch {
    return undefined
  }
  if (typeof contextWindow !== 'number' || contextWindow <= 0) return undefined
  let totalTokens: number | undefined
  try {
    totalTokens = meter.measure(agent.session).totalTokens
  } catch {
    return undefined
  }
  if (typeof totalTokens !== 'number') return undefined
  return totalTokens / contextWindow
}

/** Claude Code SnipTool analog prompt for the plan subagent. */
function planPrompt(instruction: string, perspective: string | undefined): string {
  const lens = perspective === undefined
    ? ''
    : `You are asked to apply this specific perspective to your design: ${perspective}\n\n`
  return [
    'You are a software architect and planning specialist. Your role is to explore the codebase and design an implementation plan.',
    '',
    '=== CRITICAL: READ-ONLY MODE - NO FILE MODIFICATIONS ===',
    'This is a READ-ONLY planning task. You are STRICTLY PROHIBITED from creating, modifying, deleting, moving, or copying files, and from running any command that changes system state.',
    '',
    'Your tools are limited to read-only exploration: read (read files), glob (find files by pattern), grep (search file contents), and the read-only inspection tools.',
    '',
    `Requirements:\n${instruction}`,
    '',
    lens,
    '## Your Process',
    '1. Understand Requirements: Focus on the requirements and your assigned perspective.',
    '2. Explore Thoroughly: read any relevant files, find existing patterns and conventions, understand the current architecture, identify similar features as reference, trace relevant code paths.',
    '3. Design Solution: create an implementation approach, consider trade-offs and architectural decisions, follow existing patterns.',
    '4. Detail the Plan: provide a step-by-step implementation strategy, identify dependencies and sequencing, anticipate potential challenges.',
    '',
    '## Required Output',
    'End your response with:',
    '### Critical Files for Implementation',
    'List 3-5 files most critical for implementing this plan.',
    '',
    'REMEMBER: You can ONLY explore and plan. You CANNOT and MUST NOT write, edit, or modify any files.',
  ].join('\n')
}

/** Read-only tool names a plan subagent may use. */
const PLAN_TOOL_ALLOW = [
  'read', 'glob', 'grep', 'read_image', 'describe_image',
  'get_goal', 'job_list', 'job_output', 'list_agents',
]

/** Model-facing result of the snip tool. */
interface SnipResult {
  removed: number
  kept: number
  shadowedTokens: number
}

/** Model-facing result of the plan_agent tool. */
interface PlanAgentResult {
  summary: string
  plan: string
}

/**
 * Synchronous body of the `snip` tool: replace the oldest surface messages
 * with one placeholder, pricing the shadowed nodes through the token meter.
 * Throws on unusable state; the caller wraps the result in a settled promise.
 */
function runSnip(
  ctx: Context,
  args: { keep_recent?: unknown; reason?: unknown },
  exec: ToolRunContext,
): SnipResult {
  const agent = exec.agent
  if (agent === undefined) throw new Error('snip requires an owning agent')
  const session = agent.session
  const meter: TokenMeter | undefined = ctx.get('tokenMeter')
  const nodes = [...session.surface.nodes]
  if (nodes.length === 0) return { removed: 0, kept: 0, shadowedTokens: 0 }
  let keep = typeof args.keep_recent === 'number' && Number.isFinite(args.keep_recent)
    ? Math.trunc(args.keep_recent)
    : 15
  if (keep < 1) keep = 1
  const shadowCount = nodes.length - keep
  if (shadowCount <= 0) return { removed: 0, kept: nodes.length, shadowedTokens: 0 }
  const shadowedSeqs = nodes.slice(0, shadowCount)
  const start = nodes[0]
  const end = nodes[shadowCount - 1]
  if (start === undefined || end === undefined) {
    return { removed: 0, kept: nodes.length, shadowedTokens: 0 }
  }
  let shadowedTokens = 0
  if (meter !== undefined) {
    try {
      const measurement = meter.measure(session)
      const bySeq = new Map(measurement.nodes.map(node => [node.seq, node]))
      for (const seq of shadowedSeqs) {
        const node = bySeq.get(seq)
        if (node !== undefined && typeof node.tokens === 'number') shadowedTokens += node.tokens
      }
    } catch {
      // metering is best-effort
    }
  }
  const reason = typeof args.reason === 'string' ? args.reason.slice(0, 200) : undefined
  const message = userMessage(
    `[History snipped at the model's request: earlier messages were removed.${reason === undefined ? '' : ` Reason: ${reason}`}]`,
  )
  // Shadow-price protocol: the metering event must be appended synchronously
  // right before its surface replacement.
  const pruneEvent = session.append('compaction/prune', {
    shadowedRange: { start, end },
    shadowedSeqs: [...shadowedSeqs],
    shadowedTokenCount: shadowedTokens,
  })
  session.append('user/message', message, {
    surfaceOp: { op: 'replace', start, end },
    sourceEventSeqs: [pruneEvent.seq, ...shadowedSeqs],
  })
  ctx.logger.info(`[claude-loop-alignment] snip tool: removed ${shadowCount} message(s) (${shadowedTokens} tokens)`)
  return { removed: shadowCount, kept: nodes.length - shadowCount, shadowedTokens }
}

/**
 * Plugin entry: registers the loop-boundary hooks and the two tools.
 * @param ctx - plugin context.
 * @param config - validated plugin configuration.
 */
export function apply(ctx: Context, config: ClaudeLoopAlignmentConfig): void {
  const {
    maxToolTurns,
    snipAtRatio,
    compactAtRatio,
    turnTokenBudget,
    budgetCompletionRatio,
    budgetDiminishingDelta,
    maxTokensRecoveryLimit,
    planAgentModel,
  } = config

  const enforced = new Map<string, { turn: number; injected: boolean }>()
  const budgetTrackers = new Map<string, { continuationCount: number; lastGlobalTurnTokens: number; lastDeltaTokens: number }>()
  const maxTokensTrackers = new Map<string, number>()

  ctx.logger.info(
    `[claude-loop-alignment] active: maxToolTurns=${maxToolTurns} snipAtRatio=${snipAtRatio} `
    + `compactAtRatio=${compactAtRatio} turnTokenBudget=${turnTokenBudget} `
    + `maxTokensRecoveryLimit=${maxTokensRecoveryLimit}`,
  )

  // ===== model-driven snip tool: Claude Code SnipTool analog =====
  ctx.tools.register(defineTool({
    name: 'snip',
    description: 'Remove the oldest part of the conversation history at the model\u2019s discretion (Claude Code SnipTool analog). '
      + 'Deletes all surface messages before the most recent `keep_recent` messages and replaces them with one small '
      + 'placeholder, freeing context without summarization. Use when early discussion is no longer relevant. '
      + 'Returns the number of messages and tokens removed.',
    parameters: {
      keep_recent: { type: 'integer', description: 'How many of the most recent surface messages to keep. Default 15, minimum 1.' },
      reason: { type: 'string', description: 'Optional one-line reason, recorded in the placeholder text.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          removed: { type: 'integer' },
          kept: { type: 'integer' },
          shadowedTokens: { type: 'integer' },
        },
      },
      render: (_args, value: SnipResult): ContentBlock[] => [
        { type: 'text', text: `snip: removed ${value.removed} message(s), kept ${value.kept} (${value.shadowedTokens} tokens freed)` },
      ],
    },
    isConcurrencySafe: () => false,
    execute(args: { keep_recent?: unknown; reason?: unknown }, exec: ToolRunContext): Promise<SnipResult> {
      return Promise.resolve().then(() => runSnip(ctx, args, exec))
    },
  }))

  // ===== plan_agent tool: Claude Code PLAN_AGENT (read-only architect) =====
  const subagents: SubagentRuntime | undefined = ctx.get('subagents')
  if (subagents !== undefined) {
    ctx.tools.register(defineTool({
      name: 'plan_agent',
      description: 'Delegate planning to a read-only software-architect subagent (Claude Code PLAN_AGENT analog). '
        + 'Use for implementation planning: the subagent explores the codebase with read-only tools and returns a '
        + 'step-by-step plan with critical files, without modifying anything.',
      parameters: {
        instruction: { type: 'string', description: 'The requirements to plan for: the task, the goal, and any constraints. Include relevant file paths.' },
        perspective: { type: 'string', description: 'Optional design perspective/lens to apply while planning (e.g. minimal-diff, performance-first, testability).' },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            summary: { type: 'string' },
            plan: { type: 'string' },
          },
        },
        render: (_args, value: PlanAgentResult): ContentBlock[] => [
          { type: 'text', text: value.summary },
          { type: 'text', text: `\n\n--- Plan Agent output ---\n\n${value.plan}` },
        ],
      },
      isConcurrencySafe: () => false,
      async execute(args: { instruction?: unknown; perspective?: unknown }, exec: ToolRunContext): Promise<PlanAgentResult> {
        const agent = exec.agent
        if (agent === undefined) throw new Error('plan_agent requires an owning agent')
        const names = subagents.list()
        if (names.length === 0) throw new Error('no subagent provider is registered')
        let providerName: string | undefined
        for (const candidate of names) {
          const provider = subagents.getProvider(candidate)
          if (provider !== undefined && provider.capabilities.toolFilter) {
            providerName = candidate
            break
          }
        }
        if (providerName === undefined) {
          throw new Error('no subagent provider with tool-filter capability (plan_agent needs read-only scoping)')
        }
        const instruction = typeof args.instruction === 'string' ? args.instruction : ''
        const perspective = typeof args.perspective === 'string' ? args.perspective : undefined
        const prompt = planPrompt(instruction, perspective)
        const routedProvider = agent.options.provider
        const agentOptions = planAgentModel === null || planAgentModel.length === 0 || routedProvider === undefined
          ? undefined
          : { provider: routedProvider, model: planAgentModel }
        const run = await subagents.start(providerName, {
          label: 'plan-agent',
          prompt: [{ type: 'text', text: prompt }],
          parent: agent,
          signal: exec.signal,
          maxDepth: 1,
          toolFilter: { allow: PLAN_TOOL_ALLOW },
          ...agentOptions === undefined ? {} : { agentOptions },
        })
        try {
          const result = await run.result
          const text = result.output
            .flatMap((block: ContentBlock): string[] => block.type === 'text' ? [block.text] : [])
            .join('\n')
          const reason = result.stopReason
          if (reason !== 'completed' && reason !== 'max-tokens') {
            throw new Error(`plan subagent ended with stop reason ${reason}${text.length === 0 ? '' : `:\n${text}`}`)
          }
          if (text.trim().length === 0) throw new Error('plan subagent produced no output')
          const firstLine = text.trim().split('\n').find((line: string): boolean => line.trim() !== '')
          const summary = firstLine === undefined
            ? `Plan agent finished (${reason})`
            : `Plan agent\u300c${firstLine.slice(0, 120)}\u300d (${reason})`
          return { summary, plan: text }
        } finally {
          await run.dispose()
        }
      },
    }))
  } else {
    ctx.logger.info('[claude-loop-alignment] subagents service unavailable: plan_agent tool not registered')
  }

  // ===== loop-boundary mechanisms =====
  ctx.on('agent/pre-step', async (
    { agent, turn, signal },
    next,
  ): Promise<PreStepDecision> => {
    try {
      if (signal.aborted) return await next()

      // CC-style pressure management: snip (prune), then optional summary.
      const ratio = await measureRatio(ctx, agent, signal)
      if (ratio !== undefined) {
        if (snipAtRatio > 0 && ratio >= snipAtRatio) {
          const pruner: ToolResultPruner | undefined = ctx.get('toolResultPruner')
          if (pruner !== undefined) {
            try {
              pruner.pruneSession(agent.session)
              ctx.logger.info(`[claude-loop-alignment] snip: pruned tool-result surface at ${(ratio * 100).toFixed(0)}% context pressure`)
            } catch (error: unknown) {
              ctx.logger.warn(`[claude-loop-alignment] snip prune failed: ${error instanceof Error ? error.message : String(error)}`)
            }
          }
        }
        if (compactAtRatio > 0 && ratio >= compactAtRatio) {
          const compaction: CompactionEngine | undefined = ctx.get('compaction')
          if (compaction !== undefined) {
            try {
              const trigger: CompactionTrigger = 'pressure'
              const result = await compaction.compactIfNeeded(agent, trigger, signal)
              if (result !== null) {
                ctx.logger.info(`[claude-loop-alignment] compacted at pressure: shadowed ${result.shadowedSeqs.length} surface nodes`)
              }
            } catch (error: unknown) {
              ctx.logger.warn(`[claude-loop-alignment] pressure compaction failed: ${error instanceof Error ? error.message : String(error)}`)
            }
          }
        }
      }

      // CC max_turns budget.
      if (maxToolTurns > 0) {
        const key = String(agent.session.id)
        let state = enforced.get(key)
        if (state === undefined || state.turn !== turn) {
          state = { turn, injected: false }
          enforced.set(key, state)
        }
        const toolSteps = toolStepCount(agent.session, turn)
        if (toolSteps >= maxToolTurns) {
          if (state.injected) {
            ctx.logger.info(`[claude-loop-alignment] maxToolTurns exceeded (${toolSteps} >= ${maxToolTurns}): rejecting the next step`)
            return { kind: 'reject' }
          }
          state.injected = true
          const decision = await next()
          if (decision.kind === 'reject') return decision
          ctx.logger.info(`[claude-loop-alignment] maxToolTurns reached (${toolSteps}): injecting stop instruction`)
          return { ...decision, messages: [...decision.messages, userMessage(`${STOP_PAYLOAD} (limit: ${maxToolTurns})`)] }
        }
      }
      return await next()
    } catch (error: unknown) {
      ctx.logger.warn(`[claude-loop-alignment] pre-step listener error: ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
      return await next()
    }
  })

  ctx.on('agent/turn-stopping', ({ agent, turn, signal }): void => {
    if (signal.aborted) return
    const session = agent.session
    const key = String(session.id)

    // CC max_output_tokens recovery.
    if (maxTokensRecoveryLimit > 0) {
      const finishKind = lastFinishKind(session)
      if (finishKind === 'max-tokens') {
        const count = maxTokensTrackers.get(key) ?? 0
        if (count < maxTokensRecoveryLimit) {
          maxTokensTrackers.set(key, count + 1)
          ctx.logger.info(`[claude-loop-alignment] max-tokens recovery #${count + 1}: steering resume message`)
          agent.steer(userMessage(MAX_TOKENS_RESUME))
          return
        }
        ctx.logger.info(`[claude-loop-alignment] max-tokens recovery exhausted (${count} >= ${maxTokensRecoveryLimit})`)
      } else if ((maxTokensTrackers.get(key) ?? 0) > 0) {
        maxTokensTrackers.set(key, 0)
      }
    }

    // CC TOKEN_BUDGET continuation.
    if (turnTokenBudget > 0) {
      let tracker = budgetTrackers.get(key)
      if (tracker === undefined) {
        tracker = { continuationCount: 0, lastGlobalTurnTokens: 0, lastDeltaTokens: 0 }
        budgetTrackers.set(key, tracker)
      }
      const turnTokens = turnOutputTokens(session, turn)
      const pct = Math.round((turnTokens / turnTokenBudget) * 100)
      const delta = turnTokens - tracker.lastGlobalTurnTokens
      const diminishing =
        tracker.continuationCount >= 3
        && delta < budgetDiminishingDelta
        && tracker.lastDeltaTokens < budgetDiminishingDelta
      if (!diminishing && turnTokens < turnTokenBudget * budgetCompletionRatio) {
        tracker.continuationCount += 1
        tracker.lastDeltaTokens = delta
        tracker.lastGlobalTurnTokens = turnTokens
        ctx.logger.info(`[claude-loop-alignment] token budget: nudging continuation #${tracker.continuationCount} at ${pct}% (${turnTokens.toLocaleString('en-US')} / ${turnTokenBudget.toLocaleString('en-US')})`)
        agent.steer(userMessage(BUDGET_NUDGE(pct, turnTokens, turnTokenBudget)))
        return
      }
      if (diminishing || tracker.continuationCount > 0) {
        ctx.logger.info(`[claude-loop-alignment] token budget: turn complete at ${pct}%${diminishing ? ' (diminishing returns)' : ''}`)
      }
    }
  })

  ctx.on('agent/status', ({ agent, status }): void => {
    if (status !== 'idle') return
    const key = String(agent.session.id)
    enforced.delete(key)
    maxTokensTrackers.delete(key)
    budgetTrackers.delete(key)
  })
}
