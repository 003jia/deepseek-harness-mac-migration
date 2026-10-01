---
description: "在 agent 的模型提示词中保留最近失败的工具调用，供需要在压缩后继续查看错误的部署使用。"
kind: "package-reference"
---

# @deepseek-ai/dsh-error-digest

[English](README.md) | 中文

## 概述

`dsh-error-digest` 在每个 agent 的系统提示词中加入最近失败的工具调用。摘要直接从该 agent 的持久会话事件生成，因此压缩、恢复会话或重启进程后仍能看到相同的失败。没有错误的会话不增加提示词文本。Web bundle 默认挂载此插件。

## 目录

- [使用本包](#use-this-package)
- [模型体验](#model-experience)
- [已知限制与暂缓事项](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

<a id="use-this-package"></a>
## 使用本包

默认保留最近十个不同的失败调用。每条完整错误行最多 200 个字符。同一个调用有较新的结果时，以较新的结果为准；摘要只读取文本块。原始结果仍保留在会话日志中。

| 字段 | 默认值 | 含义 |
|---|---:|---|
| `maxDigestSize` | `10` | 保留的不同失败调用数，范围为 1 到 50 |
| `maxLineCharacters` | `200` | 每条错误行的字符上限，范围为 40 到 1000 |
| `order` | `950` | 系统提示词段的顺序 |

[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-error-digest)列出字段的源码声明。

<a id="model-experience"></a>
## 模型体验

### 最近的工具错误

#### 模型看到什么

工具失败后，下一次请求包含 `Recent Errors` 段，其中列出工具名称和受限长度的单行摘要。该段还提示模型在输出被截断时读取报告中的 spill 文件。首次失败前不增加文本。

#### Token 效果

该段最多包含 `maxDigestSize` 行，每行最多 `maxLineCharacters` 个字符，另有标题与指引。每次请求都从日志重新生成，不调用模型。

#### KV Cache 影响

两次错误之间该段保持稳定。新增失败或保留窗口变化会改变提示词尾部，并可能降低提供方缓存复用。

## 已知限制与暂缓事项

<a id="known-limitations-and-deferred-work"></a>

- 非文本结果块不会进入摘要。
- 截断按字符数而非模型 token 数计算；原始 `tool/result` 事件仍可供检查。

<a id="dev-note"></a>
### 开发备注

插件为每个活动 agent 注册一个有作用域的提示词段。Host 会话投影将持久的调用与结果事件折叠为有界的最近失败列表，组装提示词时读取该状态。不发布运行时不变量伴随插件，因为投影没有可与权威会话事件独立对照的数据来源。
