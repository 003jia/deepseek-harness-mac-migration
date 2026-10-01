# @deepseek-ai/dsh-error-digest

English | [中文](README.zh.md)

Error-finding aid: monitors every `tool/result` session event whose result is marked as an error, retains a bounded digest of the most recent failures (default 10), and registers an `error-digest` system-prompt section that lists them alongside the guidance to read the reported spill file when output was truncated. The digest keeps unresolved errors visible to the model across compaction rounds that would otherwise summarize or prune them away.

The prompt section renders empty until the first error occurs, so a healthy session pays no token cost. `maxDigestSize` (default 10) bounds the retained entries; each entry is compacted to one line of at most 200 characters.

## Model Experience

### Recent tool errors

#### What the model sees

After a tool error, the system prompt adds the following stable guidance and one compact line per retained error.

##### Prompt template

```markdown
## Recent Errors
The following tool errors occurred in this session. If output was truncated,
read the spill file path reported in the truncated result before proceeding.

<numbered error lines>
```

#### Token effect

The section is empty until a tool error occurs. It retains up to `maxDigestSize` entries (default 10), with each error line capped at 200 characters.

#### KV Cache effect

The guidance is stable, but new errors append lines and the bounded digest can drop older lines; those changes affect the prompt suffix and provider cache reuse.

## Known Limitations and Deferred Work

- **In-memory digest only** — the error list lives for the plugin's lifetime and is not persisted to the session log; a reload loses it (the underlying errors remain in the log).
- **Single-line compaction** — long error bodies are truncated to 200 characters per entry; the full error stays in the original `tool/result` event.
