---
description: "记录持久化类型更改及其兼容性确认。"
kind: persistence-change
---

# 2026-09-24-memory-events

[English](2026-09-24-memory-events.md) | 中文

## 概述

记忆插件用两个新增的仅日志 Session 事件记录辅助提取请求的准确输入及结果，并用仅用于归属标识的来源类别标记记忆生成的 user 消息。

## 目录

- [声明](#declaration)
- [兼容性](#compatibility)
- [验证](#verification)
- [开发备注](#dev-note)

<a id="declaration"></a>
## 声明

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
## 兼容性

既有格式 4 记录的类型和回放行为保持不变。未加载记忆插件的读取器会保留已记录的记忆来源内容，但不会据此验证消息或赋予权限。缺少新增事件声明的旧版本可能拒绝含有记忆提取事件的日志；新增事件不改变消息表面或既有事件载荷。本地记忆存储有独立的域版本，不改变 Session 头。

<a id="verification"></a>
## 验证

持久化分类器报告四处仅用于归属标识的来源类别新增和两个普通事件新增，均允许维持当前 Session 版本。历史检查通过，覆盖 64 个类型根和 7 条记录。完整文档检查中仍有一项 Windows 站点测试失败，因为此主机拒绝创建临时符号链接。

<a id="dev-note"></a>
## 开发备注

无。
