---
description: "供 Web 智能体使用的可选 Claude 风格轮次控制、上下文裁剪与只读规划插件。"
kind: "package-reference"
---

# @deepseek-ai/dsh-claude-loop-alignment

[English](README.md) | 中文

## 概述

Web 组合包挂载此可选 agent-loop 插件。它限制每轮工具步骤数、在上下文压力下修剪过长的工具结果、可请求压缩、在输出 token 达到上限后续写，并提供 `snip` 和 `plan_agent` 工具。所有引导消息都以用户角色写入会话日志。插件使用当前的会话投影和智能体钩子，不替换循环驱动器。

## 目录

- [使用本包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

<a id="use-this-package"></a>
## 使用本包

Web 组合包默认限制每轮 20 个工具步骤，并在上下文用量达到路由模型窗口的 60% 时尝试修剪工具结果。将 `maxToolTurns`、`snipAtRatio`、`compactAtRatio`、`turnTokenBudget` 或 `maxTokensRecoveryLimit` 设为 `0` 可分别关闭对应控制。`compactAtRatio` 默认是 `0`，因为基础压缩插件已经负责自动压缩。上下文压力判断需要模型窗口大小和 token-meter 服务；缺少任一项时，不执行压力操作。

| 字段 | 默认值 | 含义 |
|---|---:|---|
| `maxToolTurns` | `20` | 给出最终回答前，每轮允许的工具步骤数 |
| `snipAtRatio` | `0.6` | 可选工具结果修剪器运行的上下文窗口比例 |
| `compactAtRatio` | `0` | 可选压缩服务运行的上下文窗口比例 |
| `turnTokenBudget` | `0` | 触发继续工作提示的每轮输出 token 目标 |
| `budgetCompletionRatio` | `0.9` | 停止继续提示的目标比例 |
| `budgetDiminishingDelta` | `500` | 重复提示停止时采用的输出 token 增量阈值 |
| `maxTokensRecoveryLimit` | `3` | `max-tokens` 结束后连续续写的次数上限 |
| `planAgentModel` | `null` | 规划子智能体的可选模型覆盖值 |
| `snipKeepRecent` | `15` | `snip` 默认保留的最近表层消息数 |
| `maxSnipReasonCharacters` | `200` | `snip` 原因写入日志的最大字符数 |

[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-claude-loop-alignment)列出源代码声明。可以用配置补丁替换 Web 条目的设置。headless 与 SDK 配置默认不挂载此插件。

<a id="model-experience"></a>
## 模型体验

### 循环控制与工具

#### 模型所见

达到工具步骤上限时，下一次请求收到一次停止提示，可以给出最终回答；如果仍调用工具，后续步骤会被拒绝。`max-tokens` 结束会在配置上限内收到续写提示。启用输出 token 预算后，插件会提示继续工作，直至达到完成比例或收益递减条件。`snip` 用已记录的短占位消息替换较旧的完整用户消息区间；`plan_agent` 以文本返回只读子智能体的规划。两者均使用通用工具渲染，不声明文件位置。

#### Token 效果

停止和续写提示每次增加一条有界的用户角色消息。`snip` 为移除的表层节点记录 `compaction/prune` 影子价格，并返回估算移除的 token 数。调用规划子智能体时，它会单独发起模型请求。

#### KV Cache 影响

已记录的引导消息追加到历史中。`snip` 替换或压力压缩会改变历史前缀，可能降低提供方缓存复用。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 没有兼容的子智能体提供方或只读检查工具时，`plan_agent` 会返回错误。
- 可裁剪的旧历史不足时，`snip` 不修改表层消息。
- 压力判断依赖路由模型报告的上下文窗口和 token-meter 的估算值。

<a id="dev-note"></a>
### 开发备注

`claudeLoop` 会话投影从持久工具步骤和输出用量事件计算实时或恢复后的状态。进程内 Map 只跟踪连续宽限和续写次数，在智能体空闲时清理。此投影没有独立数据源可与权威会话日志比对，因此不提供 invariant companion。[决策记录](../../../.agents/notes/implemented/feature/2026-09-28-claude-loop-web-launcher.zh.md)说明迁移和 Web 启动器的选择。
