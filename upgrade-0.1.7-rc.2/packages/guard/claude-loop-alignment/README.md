---
description: "Optional Claude-style turn controls, context trimming, and read-only planning for the Web agent."
kind: "package-reference"
---

# @deepseek-ai/dsh-claude-loop-alignment

English | [中文](README.zh.md)

## Summary

The Web bundle mounts this optional agent-loop plugin. It limits tool-use steps per turn, prunes oversized tool results under context pressure, can request compaction, resumes after an output-token limit, and offers `snip` and `plan_agent` tools. All steering enters the logged session as user-role messages. The plugin uses the current session projection and agent hooks; it does not replace the loop driver.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## Use this package

The Web bundle enables a limit of 20 tool-use steps per turn and a tool-result prune attempt at 60% of the routed model's context window. Set `maxToolTurns`, `snipAtRatio`, `compactAtRatio`, `turnTokenBudget`, or `maxTokensRecoveryLimit` to `0` to disable each control. `compactAtRatio` defaults to `0` because the base compaction plugin already manages automatic compaction. Context pressure requires both a resolved model context window and the token-meter service. When either is unavailable, pressure actions do not run.

| Field | Default | Meaning |
|---|---:|---|
| `maxToolTurns` | `20` | Tool-use steps allowed in one turn before a final-answer grace step |
| `snipAtRatio` | `0.6` | Context-window ratio at which the optional tool-result pruner runs |
| `compactAtRatio` | `0` | Context-window ratio at which the optional compaction service runs |
| `turnTokenBudget` | `0` | Target output tokens per turn for continuation nudges |
| `budgetCompletionRatio` | `0.9` | Fraction of the target at which nudges stop |
| `budgetDiminishingDelta` | `500` | Output-token increase below which repeated nudges stop |
| `maxTokensRecoveryLimit` | `3` | Consecutive resumes after a `max-tokens` finish |
| `planAgentModel` | `null` | Optional model override for the planning child |
| `snipKeepRecent` | `15` | Default minimum recent surface messages retained by `snip` |
| `maxSnipReasonCharacters` | `200` | Maximum recorded characters in a `snip` reason |

The [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-claude-loop-alignment) lists source declarations. A profile patch can replace the Web row's config. The headless and SDK profiles do not mount this plugin by default.

<a id="model-experience"></a>
## Model Experience

### Loop controls and tools

#### What the model sees

At the tool-step limit, the next request receives one stop instruction and may produce a final answer; a further tool call causes the following step to be rejected. A `max-tokens` finish receives a resume instruction up to the configured limit. An enabled token budget nudges continuation until the completion ratio or diminishing-return condition is met. The `snip` tool replaces an older complete user-message span with a short logged placeholder; `plan_agent` returns a read-only child's plan as text. Both use generic tool rendering and declare no file locations.

#### Token effect

The stop and resume instructions add one bounded user-role message per attempt. `snip` records a `compaction/prune` shadow price for removed surface nodes and returns estimated tokens removed. The planning child makes a separate model request when invoked.

#### KV Cache effect

Logged steering messages append to history. A `snip` replacement or pressure compaction changes the history prefix and may reduce provider cache reuse.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- `plan_agent` returns an error when no compatible subagent provider or read-only inspection tool is registered.
- A `snip` call with too little earlier history leaves the surface unchanged.
- Pressure decisions depend on the routed model's reported context window and token-meter estimate.

<a id="dev-note"></a>
### Dev Note

The `claudeLoop` session projection counts durable tool steps and output usage for live and resumed sessions. In-process maps track only consecutive grace and continuation attempts; they clear when the agent becomes idle. No invariant companion is published because the projection owns no independent source to compare with the authoritative session log. The [decision note](../../../.agents/notes/implemented/feature/2026-09-28-claude-loop-web-launcher.md) records the migration and Web launcher choice.
