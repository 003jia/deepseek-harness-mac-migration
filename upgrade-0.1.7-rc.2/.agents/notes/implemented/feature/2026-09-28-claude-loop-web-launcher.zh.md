# Agent Note: Claude 循环控制与 Web 桌面启动器

Status: implemented

[English](2026-09-28-claude-loop-web-launcher.md) | 中文

## Problem

旧工作台在扩展包中提供 Claude 风格的轮次控制，但当前 Web 组合没有加载该包。旧实现读取已经废弃的会话事件数组，并通过旧版 API 注册工具。从源码目录启动 Web 应用还需要终端命令，而此 Windows 安装通过桌面图标使用。

## Decision

Web 组合包将 `dsh-claude-loop-alignment` 挂载为 guard 插件。会话投影从持久事件计算工具步骤数、输出用量、最后结束原因和用户消息位置。插件使用当前的 `agent/pre-step` 与 `agent/turn-stopping` 钩子实现轮次限制与恢复，并用当前工具注册方式提供 `snip` 与 `plan_agent`。`snip` 用已记录的用户角色占位消息替换当前表层区间，替换前写入 token 影子价格事件。仅当子智能体提供方强制执行工具过滤与深度限制时才提供规划子智能体；允许的工具限于已注册的只读检查工具。

仓库自带的 Windows 命令文件从源码目录启动已发布的 Web profile。桌面快捷方式指向该文件，并使用现有应用图标。Web 运行时在启动完成后通过默认浏览器打开认证 URL。

## Alternatives considered

**修改 agent-loop 驱动器。** 现有的 pre-step 与 turn-stopping 钩子已经可以表达这些策略，驱动器分支会扩大受影响范围。

**为此源码目录使用 Electron 二进制包。** 需要的启动器只负责打开 Web 前端，仓库已有对应运行时。指向 Web profile 的快捷方式不需要额外构建和签名桌面包。

## Consequences

Web profile 默认获得 20 步工具预算，并在上下文压力达到 60% 时尝试修剪。headless 和 SDK profile 可独立组合。压力控制依赖可选的模型窗口与 token-meter 数据；规划工具依赖兼容的子智能体提供方。源码启动器需要已安装的工作区依赖和已构建的前端资源。无密钥的装配 profile 快照覆盖一个工具步骤后的日志停止提示，以及模型请求的 `snip` 替换。
