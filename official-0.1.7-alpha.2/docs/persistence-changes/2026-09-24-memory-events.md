---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-09-24-memory-events

English | [中文](2026-09-24-memory-events.zh.md)

## Summary

The memory plugin records the exact auxiliary extraction request and its outcome in two new log-only Session events. It also identifies memory-produced user messages with an attribution-only source kind.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

```yaml persistence-change
schemaVersion: 1
id: 2026-09-24-memory-events
baseline: false
changes:
  - root: "event:agent/inbox/spliced"
    previous: "2026-09-16-session-format-v4"
    after: "582e810d1fd6bc63e800b7bff33ca8df84e29146cc1270b68c924ec18bda540c"
    decision: same-version
  - root: "event:developer/message"
    previous: "2026-09-16-session-format-v4"
    after: "dd30d2bb3af44e51efa01a0d5d2127937c34586085fb755c84a11dbe292340a1"
    decision: same-version
  - root: "event:memory/extraction-request"
    previous: null
    after: "51618ea649ecd31135af83ffa91dc1d4e4c6fb6b161f7fbb87dc5aaa0570f49c"
    decision: same-version
  - root: "event:memory/extraction-result"
    previous: null
    after: "fc0e65a0a33aa3ab0fb41cd224a4e7d5f794ffcf311708b9f3fd28b1a33cdff2"
    decision: same-version
  - root: "event:session/title-llm-request"
    previous: "2026-09-16-session-format-v4"
    after: "3de6572f0f3059e5fbe4d5ee48f86e50e491218b033b9a77f935c871d3503b05"
    decision: same-version
  - root: "event:user/message"
    previous: "2026-09-16-session-format-v4"
    after: "27f89a1ca12ba00c5229092129dbbfe89c67e3730fe27cc80b2cfcfc93d126aa"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibility

Existing format 4 records retain their types and replay behavior. Readers that do not mount the memory plugin preserve a known memory source as recorded content without using it for validation or authority. Older builds without the new event declarations can reject logs containing memory extraction events; the new events do not alter the message surface or existing event payloads. The local memory store has its own domain version and does not change the Session header.

<a id="verification"></a>
## Verification

The persistence classifier reports four attribution-kind additions and two ordinary event additions, all allowed at the same Session version. The history check passes for 64 roots and seven records. The full documentation run has one remaining Windows site-test failure because this host denies temporary symbolic-link creation.

<a id="dev-note"></a>
## Dev Note

None.
