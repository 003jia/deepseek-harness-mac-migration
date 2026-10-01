# @deepseek-ai/dsh-claude-loop-alignment

English | [中文](README.zh.md)

Claude Code agent-loop alignment for the DeepSeek Harness: one opt-in host plugin that layers Claude Code's loop behavior onto DSH's existing extension points — the `agent/pre-step` waterfall, the `agent/turn-stopping` boundary, the tools registry, and the subagent runtime — without touching the loop kernel. Every optional service is read through `ctx.get()` with an undefined check, so the plugin degrades gracefully in a composition that lacks a sibling service and can never break the loop.

## What it does

- `maxToolTurns` — a per-turn tool-use budget (the Claude Code `max_turns` analog). Once the cap is reached, one grace step runs with an injected stop instruction; a model that still calls tools has the following step rejected and the turn closes.
- `snipAtRatio` — a cheap per-turn pressure pass: when context pressure exceeds the ratio, the optional `toolResultPruner` sibling prunes oversized tool results (silently no-ops without that service).
- `compactAtRatio` — pressure compaction through `ctx.compaction`. Keep at 0 when `dsh-compaction-basic` runs with `auto: true` (it already checks the same seam itself).
- `turnTokenBudget` — the Claude Code `TOKEN_BUDGET` analog: steer the model to keep working up to a token target, stopping at the completion ratio or on diminishing returns.
- `maxTokensRecoveryLimit` — the Claude Code `max_output_tokens` recovery: steer a resume message after a `max-tokens` finish, up to the limit.
- `snip` tool — the Claude Code SnipTool analog: the model may drop the oldest history and replace it with one placeholder at its own discretion.
- `plan_agent` tool — the Claude Code PLAN_AGENT analog: a read-only software-architect subagent, gated on a provider with `toolFilter` capability so the child can only read.

## How it composes

No hard service dependency (`inject` is empty); everything is optional. Insert the package into a host graph like any plugin — the CLI app already carries the workspace dependency and `examples/web-cordis/cordis.yml` carries the graph row. When the `subagents` service is absent the `plan_agent` tool is simply not registered and the fact is logged; when the token meter, LLM runtime, compaction engine, or tool-result pruner is absent the corresponding pass skips. Per-session tracker state (turn budget, token budget, max-tokens recovery counters) is process-local and resets when the agent goes idle.

## Config

- `maxToolTurns` (integer, default 20) — maximum tool-use steps per user turn; 0 disables the budget.
- `snipAtRatio` (number 0–1, default 0.6) — pressure ratio at which tool-result pruning fires; 0 disables.
- `compactAtRatio` (number 0–1, default 0) — pressure ratio at which `ctx.compaction` compaction fires; 0 disables.
- `turnTokenBudget` (integer, default 0) — output-token target per turn; 0 disables budget steering.
- `budgetCompletionRatio` (number 0–1, default 0.9) — fraction of the target at which continuation nudges stop.
- `budgetDiminishingDelta` (integer, default 500) — output-token delta below which continuation is judged diminishing.
- `maxTokensRecoveryLimit` (integer, default 3) — maximum consecutive `max-tokens` resume steers; 0 disables recovery.
- `planAgentModel` (string or null, default null) — optional model override for the plan subagent; null inherits the parent's route.

## Model Experience

### The `snip` tool

#### What the model sees

A `snip` tool definition with `keep_recent` and `reason` parameters that invites the model to drop stale history at its own discretion; the replacement placeholder (`[History snipped at the model's request: ...]`) enters the transcript as an ordinary user message tagged with the `claude-loop-alignment` source.

#### Token effect

Removing the oldest surface messages and replacing them with one small placeholder frees those tokens on every later request; the tool result reports the removed/kept message counts and the freed-token estimate.

#### KV Cache effect

Destructive for the prefix: the surface replacement truncates everything before the kept tail, so cached prefix blocks up to the cut cannot be reused for subsequent turns.

### The `plan_agent` tool

#### What the model sees

A `plan_agent` tool definition (`instruction`, optional `perspective`) whose prompt tells the child it is a read-only software architect; the parent receives the subagent's summary and full plan as text blocks in the tool result.

#### Token effect

The parent pays only the returned plan text — exploration happens in the child agent's own context, and the child is restricted to read-only tools through the provider's `toolFilter` capability.

#### KV Cache effect

Append-only for the parent: the tool call and its result join the surface at the tail, so the parent's cached prefix stays valid.

### Turn-boundary steering messages

#### What the model sees

Plugin-authored user messages at loop boundaries: a stop instruction once `maxToolTurns` is reached, token-budget continuation nudges (`Stopped at N% of token target ...`), and `max-tokens` resume steers — each tagged with the `claude-loop-alignment` source.

#### Token effect

Each steering message costs a few dozen tokens; the turn budget closes further tool calls by policy (the next step is rejected), not by context growth.

#### KV Cache effect

Append-only until a snip fires: steering messages extend the surface at the turn boundary, but a `snip` call or the pressure prune truncates the prefix and invalidates the cached blocks before the cut.

## Known Limitations and Deferred Work

- No package-local test suite yet — behavior is exercised only through composed-app runs; unit coverage for the budget, recovery, and pressure paths is pending.
- The `snip` tool's `keep_recent` floor is fixed (minimum 1, default 15) and never summarizes — Claude Code parity is behavioral, not token-exact.
- `plan_agent` requires a subagent provider with `toolFilter`; without one the tool is not registered and the model sees nothing (logged at info level).
- Per-session trackers are process-local maps keyed by session id and reset when the agent goes idle; they are not durable across restarts.
- Pressure measurement needs both the token meter and the LLM runtime — without either, `snipAtRatio` and `compactAtRatio` silently skip.
