---
description: "保存技能、MCP 与子智能体配置的 Host 服务。"
kind: "package-reference"
---

# @deepseek-ai/dsh-host-capability-manager

[English](README.md) | 中文

## 概述

此 Host 服务持久化受管理的能力，并启用已开启的提供方。

## 目录

- [详细说明](#details)
- [模型体验](#model-experience)
- [已知限制与暂缓事项](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

<a id="details"></a>

## 详细说明

Host 服务会将由 Settings 管理的 `skill`、`mcp` 和 `subagent` 条目保存在 `capability-manager` 插件配置中，并把启用条目作为 Cordis fiber 挂载。保存、启停、移除和重连操作会串行处理；持久化的启用值与 `pending`、`active`、`failed`、`disabled` 等运行时状态分别表示。

技能条目指向一个绝对本地目录。管理器会通过技能文件系统 provider 注册该目录，不会复制或删除源文件。MCP 条目会在 Host 上启动 stdio 命令，或连接 Streamable HTTP 服务；其 JSON 配置需提供正数 `toolCallTimeoutMs` 作为每次工具调用超时。stdio 命令使用本机用户的进程权限运行，不会继承会话工作区沙箱。HTTP header 和 stdio 环境变量使用凭据引用，并通过 `ctx.credentials` 解析；含用户信息的 URL 和名称明显像凭据的查询参数会被拒绝。子智能体条目配置现有的 tool-subagent Consumer，并指定一个必须已注册的 provider。外部 provider 可能在本地工作区沙箱之外运行。

这些设置不会安装 npm 包，也不会修改当前 profile 的 bundle 列表。插件 bundle 安装与移除仍由 Extensions 设置入口和 `profileManager` 负责；成功修改包后需要重启 Host。能力配置保存在 Host 设置文件中，因此只应启用可信的命令、MCP 服务、目录和 provider。

## 公共类型

`CapabilityId` 标识已保存条目。`CapabilityKind` 为 `skill`、`mcp` 或 `subagent`。`CapabilityConfig` 保存 provider 专用 JSON 值，密钥只通过凭据引用表示。`CapabilitySnapshot` 返回每个已保存条目的当前挂载状态和适合用户查看的错误摘要。

<a id="dev-note"></a>

## 开发备注

本包的运行入口与配置位于同目录的 `src/` 和 `package.json`。

<a id="model-experience"></a>

## 模型体验

### 已启用的 Host 能力

#### 模型可见内容

管理器的 Settings Remote 不会添加提示文本。已启用的 `skill` 目录可供技能目录 Consumer 使用，`mcp` 连接会公开发现到的工具，`subagent` 条目会为之后的 Agent 请求注册委派工具。stdio MCP 进程在 Host 上运行，不受会话文件沙箱约束。

#### Token 影响

只有启用的技能上下文或工具声明会增加模型输入，具体数量取决于 provider 结果和每个请求可用的工具。

#### KV Cache effect

更改已启用条目可能改变之后的技能上下文或工具声明以及提供方缓存复用；设置操作不会重写已经发送的请求。

<a id="known-limitations-and-deferred-work"></a>

## 已知限制与暂缓事项

- **没有技能目录安装器**：用户选择一个已存在的绝对路径；添加或移除条目不会复制、更新或删除源文件。
- **MCP 健康状态等于挂载状态**：页面报告 Cordis 生命周期状态并可重连 fiber，但不提供独立测试调用界面或语义健康检查。
- **子智能体 provider 需要在其他位置配置**：此页面可以选择已注册的 provider，但不能安装 provider，也不能保证其 worker 继承会话沙箱。
- **插件 bundle 操作仍分开管理**：插件目录和 profile 修改由 Extensions 设置功能负责。

不发布运行时不变量伴随插件，因为能力启用直接读取所属 Cordis 服务状态，不维护第二份生命周期记录。
