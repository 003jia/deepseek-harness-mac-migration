---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-09-28-claude-loop-source

[English](2026-09-28-claude-loop-source.md) | 中文

## 概述

Claude loop 引导消息和 snip 占位消息在已记录的用户角色消息及辅助请求类型中使用生产者专属的来源种类。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

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
## 兼容性

新增来源只有必需的 kind 判别字段。现有消息字段和旧来源分支保持不变，因此保留纯归属来源种类的读取器可在同一会话格式版本下读取新旧日志。

<a id="verification"></a>
## 验证

生成的持久化 schema 和目录已更新，持久化变更检查将所有新增位置分类为纯归属来源，并且无密钥的 headless 快照通过正式 profile 记录 Claude loop 停止消息。

<a id="dev-note"></a>
## 开发备注

无。
