---
description: "提供本地记忆存储与提取的 Host 服务。"
kind: "package-reference"
---

# @deepseek-ai/dsh-host-memory

[English](README.md) | 中文

## 概述

此 Host 服务在会话之外保存事实，并控制模型辅助提取与召回。

## 目录

- [详细说明](#details)
- [模型体验](#model-experience)
- [已知限制与暂缓事项](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

<a id="details"></a>

## 详细说明

由 Host 持有的 Memory 服务会把用户手动编写或模型提取的精简事实保存在已配置的 `storage-domain` 后端中。Web profile 将此领域路由到 DSH home 目录下的本地 JSON 存储。`enabled` 默认 `false`；`autoExtract` 默认 `true`，但只有启用 Memory 后才生效。关闭 Memory 会保留已保存的事实和两个偏好设置，停止后续提取，并从之后的 Agent 请求中排除已保存事实。

每次成功的 `turn/end` 后，服务会排队处理该轮用户消息，并使用对话请求路由中记录的提供方和模型调用 `purpose: 'memory'`。它只接受由短字符串组成的 JSON 数组，过滤常见凭据格式，按项目作用域和规范化后的内容去重，并在提取完成后推进每会话事件游标。Settings Remote 支持修改偏好、手动提取已加载对话，以及编辑或删除记忆条目。删除会记录内容 tombstone，防止完全相同的规范化文本之后被再次提取。

当前召回逻辑会在字符预算内选择最新的共享事实，以及工作区路径与活动会话完全一致的事实；它不使用 embedding 或语义排序。注入上下文会将已保存内容标为参考事实，提取指令也会把引用文档和嵌入式指令视为数据。凭据匹配是启发式规则，不能保证识别所有密钥。Memory 是辅助模型请求，提供方位置、费用和账户行为遵循当前对话使用的模型。

## 公共类型

`MemoryId` 根据事实的初始作用域和规范化内容标识已保存条目。`MemorySnapshot` 携带两项设置、已保存的 `MemoryEntry` 值和当前提取状态。

<a id="dev-note"></a>

## 开发备注

本包的运行入口与配置位于同目录的 `src/` 和 `package.json`。

<a id="model-experience"></a>

## 模型体验

### 自动提取与召回

#### 模型看到的内容

每轮结束后，所选提供方会收到已记录的提取提示词和有长度上限的用户消息输入。后续 Agent 步骤会收到工作区匹配和共享范围内的已保存事实，并以明确标注为参考事实的 user message 追加到输入中。`memory/extraction-request` 和 `memory/extraction-result` 事件记录辅助请求的准确输入、结果、保存数量以及可用的 token 用量；失败不会被视为游标已成功推进。

#### Token 影响

辅助请求使用配置的 `maxOutputTokens` 预算。召回会向 Agent 输入追加最多 `maxRecallCharacters` 字符的已保存事实；两个限制都由 Host 配置。

#### KV Cache 影响

提取是独立的提供方请求，不会修改主请求的前缀。召回事实会改变之后的 Agent 输入，也可能改变提供方缓存复用。

<a id="known-limitations-and-deferred-work"></a>

## 已知限制与暂缓事项

- **提取依赖模型**：结果会解析并限制长度，但模型仍可能遗漏或误述事实；用户可以检查、编辑和删除条目。
- **召回只按精确工作区路径和更新时间**：不按语义相关性、项目路径包含关系或时间衰减排序。
- **凭据过滤是启发式的**：会拦截常见 token 和密码格式，但无法识别所有密钥表达形式。
- **自动提取失败后需要用户稍后重试**：失败不会推进游标，也不会在后续轮次开始后自动重试。
- **手动提取只处理已加载对话**：提取从当前内存中的 Session 读取，不会打开任意归档会话。
