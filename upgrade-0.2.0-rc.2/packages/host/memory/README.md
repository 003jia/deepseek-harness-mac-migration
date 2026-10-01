---
description: "Host service for local Memory storage and extraction."
kind: "package-reference"
---

# @deepseek-ai/dsh-host-memory

English | [中文](README.zh.md)

## Summary

This Host service stores facts separately from sessions and controls model-assisted extraction and recall.

## Table of Contents

- [Details](#details)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

## Details

The Host-owned Memory service stores concise user-authored or model-extracted facts in the configured `storage-domain` backend. The Web profile routes this domain to local JSON storage under the DSH home directory. `enabled` defaults to `false`; `autoExtract` defaults to `true` but has no effect until Memory is enabled. Turning Memory off retains saved facts and both preferences, stops future extraction, and excludes saved facts from later Agent requests.

After a completed `turn/end`, the service queues that turn's user messages and calls the provider and model recorded by the conversation's request route with `purpose: 'memory'`. It accepts only a JSON array of short strings, filters common credential patterns, de-duplicates by project scope and normalized content, and advances the per-session event cursor after a completed extraction. A settings Remote supports preference changes, manual extraction of a loaded conversation, and editing or deleting entries. Deletion records a content tombstone so later extraction does not restore identical normalized text.

Recall currently selects the newest shared facts and facts whose workspace exactly matches the active session path, within a configured character budget; it does not use embeddings or semantic ranking. The injected context labels saved items as reference facts, and the extraction instructions treat quoted documents and embedded instructions as data. Credential matching is heuristic and cannot guarantee that every secret is recognized. Memory is an auxiliary model request, so provider location, cost, and account behavior follow the selected conversation model.

## Public types

`MemoryId` identifies a saved fact by its initial scope and normalized content. `MemorySnapshot` carries the two settings, saved `MemoryEntry` values, and current extraction status.

## Dev Note

The runtime entry points and composition metadata live in this package's `src/` and `package.json`.

## Model Experience

### Automatic extraction and recall

#### What the model sees

The selected provider receives the logged extraction prompt and bounded user-message input after a completed turn. Later Agent steps receive saved facts for the matching workspace and shared scope as a user message that explicitly labels them as reference facts. `memory/extraction-request` and `memory/extraction-result` events record the exact auxiliary input, outcome, saved count, and available token usage; failures are not treated as successful cursor advancement.

#### Token effect

The auxiliary request uses the configured `maxOutputTokens` budget. Recall adds up to `maxRecallCharacters` of saved facts to Agent input; both limits are Host configuration values.

#### KV Cache effect

Extraction is a separate provider request and does not change the main request's prefix. Recalled facts do change later Agent input and can change provider cache reuse.

## Known Limitations and Deferred Work

- **Extraction is model-dependent** — the result is parsed and bounded, but a model can still omit or misstate a fact; users can review, edit, and delete saved entries.
- **Recall uses exact workspace matching and recency** — it does not rank by semantic relevance, project ancestry, or recency decay.
- **Credential filtering is heuristic** — it blocks common token and password patterns, not every possible secret representation.
- **Automatic failures need a later user retry** — a failed extraction leaves the cursor unchanged and is not retried automatically after a later turn starts.
- **Only loaded conversations can be manually extracted** — extraction reads the current in-memory Session and does not open arbitrary archived sessions.
