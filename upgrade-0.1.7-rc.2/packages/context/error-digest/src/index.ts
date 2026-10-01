/** Keep recent tool failures visible after conversation compaction. @module */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { z as zod } from 'zod'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session-projection'
import type {} from '@deepseek-ai/dsh-system-prompt'

export const name = 'error-digest'
export const inject = ['agents', 'sessionProjections']

/** Bounds for the per-agent prompt derived from durable tool results. */
export interface Config {
  /** Number of distinct failed tool calls retained in the prompt. */
  maxDigestSize?: number
  /** Maximum characters in a complete numbered error line. */
  maxLineCharacters?: number
  /** Placement of the prompt section among other context sections. */
  order?: number
}

export const Config: z<Config> = z.object({
  maxDigestSize: z.number().step(1).min(1).max(50).default(10),
  maxLineCharacters: z.number().step(1).min(40).max(1000).default(200),
  order: z.number().default(950),
})

/** Bound one result while collapsing whitespace, without materializing long tool output. */
function errorLine(toolName: string, blocks: readonly ContentBlock[], maxCharacters: number): string {
  let line = ''
  let count = 0
  let spacing = false
  for (const piece of [`[${toolName}]`, ...blocks.flatMap(block => block.type === 'text' ? [block.text] : [])]) {
    for (const character of piece) {
      if (/\s/u.test(character)) { spacing = true; continue }
      if (spacing && count > 0 && count < maxCharacters) { line += ' '; count += 1 }
      spacing = false
      if (count >= maxCharacters) return line
      line += character
      count += 1
    }
    spacing = true
  }
  return line
}

/** State retained by the session projection for resumed agents. */
interface ErrorDigestState {
  pending: Record<string, string>
  errors: { callId: string; line: string }[]
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    /** Recent failed tool results and names of calls awaiting results. */
    errorDigest: ErrorDigestState
  }
}

const stateSchema: zod.ZodType<ErrorDigestState> = zod.object({
  pending: zod.record(zod.string(), zod.string()),
  errors: zod.array(zod.object({ callId: zod.string(), line: zod.string() })),
})

/**
 * Fold a committed call or result into the durable error summary.
 * @param state - previous projection state.
 * @param event - newly committed session event.
 * @returns state after the event.
 */
export function applyErrorEvent(state: ErrorDigestState, event: SessionEvent): ErrorDigestState {
  if (event.type === 'tool/call') {
    return { ...state, pending: { ...state.pending, [event.data.callId]: event.data.name } }
  }
  if (event.type !== 'tool/result') return state
  const result = event.data.message
  const toolName = state.pending[result.toolCallId] ?? 'tool'
  const pending = Object.fromEntries(Object.entries(state.pending).filter(([callId]) => callId !== result.toolCallId))
  const errors = state.errors.filter(item => item.callId !== result.toolCallId)
  if (result.isError) {
    errors.push({ callId: result.toolCallId, line: errorLine(toolName, result.content, 1000) })
  }
  return { pending, errors: errors.slice(-50) }
}

/**
 * Render recent failures from the maintained session projection.
 * @param state - current projection state.
 * @param maxDigestSize - maximum failures shown.
 * @param maxLineCharacters - maximum characters per numbered line.
 * @returns an empty string for sessions without recent failures.
 */
export function renderErrorDigest(state: ErrorDigestState, maxDigestSize: number, maxLineCharacters: number): string {
  const lines = state.errors.slice(-maxDigestSize)
  if (lines.length === 0) return ''
  return [
    '## Recent Errors',
    'The following tool errors occurred in this session. If output was truncated, read the spill file path reported in the truncated result before proceeding.',
    ...lines.map((error, index) => `${index + 1}. ${error.line}`.slice(0, maxLineCharacters)),
  ].join('\n')
}

/** Register one scoped prompt section for each live agent. */
export function apply(ctx: Context, config: Config = {}): void {
  const maxDigestSize = config.maxDigestSize ?? 10
  const maxLineCharacters = config.maxLineCharacters ?? 200
  const order = config.order ?? 950
  if (!Number.isInteger(maxDigestSize) || maxDigestSize < 1 || maxDigestSize > 50) throw new TypeError('error-digest maxDigestSize must be an integer from 1 to 50')
  if (!Number.isInteger(maxLineCharacters) || maxLineCharacters < 40 || maxLineCharacters > 1000) throw new TypeError('error-digest maxLineCharacters must be an integer from 40 to 1000')
  if (!Number.isFinite(order)) throw new TypeError('error-digest order must be finite')

  ctx.sessionProjections.register({
    key: 'errorDigest',
    stateVersion: 1,
    stateSchema,
    init: () => ({ pending: {}, errors: [] }),
    apply: applyErrorEvent,
  })

  const fibers = new Map<Agent, ReturnType<Context['inject']>>()
  const disposals = new Set<Promise<void>>()
  const install = (agent: Agent): ReturnType<Context['inject']> => {
    const existing = fibers.get(agent)
    if (existing !== undefined) return existing
    const fiber = agent.ctx.inject(['systemPrompt'], (scope) => {
      scope.systemPrompt.section({
        name: 'context:error-digest', order,
        text: () => {
          const state = ctx.sessionProjections.stateOf(agent.session, 'errorDigest')
          if (state === undefined) throw new Error('error-digest session projection is unavailable')
          return renderErrorDigest(state, maxDigestSize, maxLineCharacters)
        },
      })
    })
    fibers.set(agent, fiber)
    return fiber
  }
  const remove = (agent: Agent): void => {
    const fiber = fibers.get(agent)
    if (fiber === undefined) return
    fibers.delete(agent)
    const disposal = fiber.dispose().catch((error: unknown) => {
      ctx.logger.warn(`error-digest: prompt cleanup failed: ${error instanceof Error ? error.message : String(error)}`)
    })
    disposals.add(disposal)
    void disposal.finally(() => { disposals.delete(disposal) })
  }
  for (const agent of ctx.agents.list()) install(agent)
  ctx.on('agent/created', async ({ agent }) => { await install(agent) })
  ctx.on('agent/disposed', ({ agent }) => { remove(agent) })
  ctx.effect(() => async () => {
    const active = [...fibers.values()]
    fibers.clear()
    await Promise.all([...active.map(fiber => fiber.dispose()), ...disposals])
  }, 'error-digest: prompt sections')
}
