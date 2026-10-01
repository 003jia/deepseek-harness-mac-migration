---
description: "Recent failed tool calls in the agent's model prompt, for deployments retaining error context across compaction."
kind: "package-reference"
---

# @deepseek-ai/dsh-error-digest

English | [中文](README.zh.md)

## Summary

`dsh-error-digest` adds recent failed tool calls to each agent's system prompt. It derives the digest from that agent's durable session events, so the same failures remain visible after compaction, resume, and process restart. Healthy sessions add no prompt text. The Web bundle mounts it by default.

## Table of Contents

- [Use this package](#use-this-package)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

<a id="use-this-package"></a>
## Use this package

The default configuration retains ten distinct failed calls. Each complete error line is limited to 200 characters. A later result for the same call replaces an earlier result, and only text blocks enter the summary. The original result remains in the session log.

| Field | Default | Meaning |
|---|---:|---|
| `maxDigestSize` | `10` | Distinct failed calls retained, from 1 to 50 |
| `maxLineCharacters` | `200` | Maximum characters in each error line, from 40 to 1000 |
| `order` | `950` | System prompt section order |

The [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-error-digest) lists the source declarations.

<a id="model-experience"></a>
## Model Experience

### Recent tool errors

#### What the model sees

When a tool fails, the next request includes a `Recent Errors` section with the tool name and a bounded one-line summary. The section also directs the model to read a reported spill file when output was truncated. No text is added before the first failure.

#### Token effect

The section contains at most `maxDigestSize` lines of at most `maxLineCharacters` characters each, plus its heading and instruction. It is recomputed from the log on each request and makes no model call.

#### KV Cache effect

The section stays stable between errors. A new failure or a changed retention window changes the prompt suffix and can reduce provider cache reuse.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- Non-text result blocks do not appear in the digest.
- Truncation is by character count rather than model token count; the original `tool/result` event remains available for inspection.

<a id="dev-note"></a>
### Dev Note

The plugin registers one scoped prompt section per live agent. A Host session projection folds durable call and result events into bounded recent failures, and prompt assembly reads that state. No invariant companion is published because the projection owns no independent data source to compare against the authoritative session events.
