---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-09-28-claude-loop-source

English | [中文](2026-09-28-claude-loop-source.zh.md)

## Summary

Claude loop steering and snip placeholders use a producer-specific message source kind in logged user-role messages and auxiliary request types.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

```yaml persistence-change
schemaVersion: 1
id: 2026-09-28-claude-loop-source
baseline: false
changes:
  - root: "event:agent/inbox/spliced"
    previous: "2026-09-24-memory-events"
    after: "d516b30a444b90783cceebe7b313973a922950376f07825209a95fbde46b7ff6"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-09-24-memory-events"
    after: "80470bc185b3b0225d4fbd256e9b93c6effb732a5d838954e0c769dc4fd103e8"
    decision: same-version
  - root: "event:memory/extraction-request"
    previous: "2026-09-24-memory-events"
    after: "7976c43d2d1d8432d46ee3fccc315abfc2f5bc443d1638c542ef96f073e0738d"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-09-24-memory-events"
    after: "ea1f508434a8356734292570854f78bea005bc3d06cda069f603a5ad64008b33"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-09-24-memory-events"
    after: "54259e2ffc620563ac70121999b39f049b3821eaddd25859d54dc32d93f1b147"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibility

The new source carries only the required kind discriminator. Existing message fields and earlier source alternatives remain unchanged, so readers that preserve attribution-only source kinds continue to read older and newer logs at the same Session format version.

<a id="verification"></a>
## Verification

The generated persistence schema and catalog are current, the persistence-change check classifies every added occurrence as attribution-only, and the keyless headless snapshot records a Claude loop stop message through the production profile.

<a id="dev-note"></a>
## Dev Note

None.
