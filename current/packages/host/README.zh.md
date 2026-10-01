# host/ — Web GUI 宿主侧

[English](README.md) | 中文

dsh Web GUI 的宿主侧：所有客户端形态共享的 API 网关，以及承载它的普通 HTTP 服务器。浏览器侧位于 [`client/`](../client/README.md)；组合应用是 [`apps/cli`](../../apps/cli/README.md)，它启动 [`dsh-base` 组合包](../bundle/base/cordis.patch.yml) 来提供 [`apps/web`](../../apps/web/)。这些全是**产品**包。

| 包 | 职责 | ctx key |
|---|---|---|
| [`apiproxy/`](apiproxy/README.md) | 共享宿主 API 网关和协议约定 | `ctx.apiProxy` |
| [`webserver/`](webserver/README.md) | HTTP 路由载体 | `ctx.webServer` |
| [`frontend-static/`](frontend-static/README.md) | 占据 webserver 回退席位的 SPA dist 服务器 | 消费 `ctx.webServer` |
| [`directory-picker/`](directory-picker/README.md) | 工作区目录选择 seam | `ctx.directoryPicker` |
| [`directory-picker-native/`](directory-picker-native/README.md) | 原生目录选择器后端和浏览器交互 | 注册 `ctx.directoryPicker` |
| [`directory-picker-browse/`](directory-picker-browse/README.md) | 应用内目录浏览器后端和交互 | 注册 `ctx.directoryPicker` |
| [`directory-picker-auto/`](directory-picker-auto/README.md) | 宿主自适应选择器组合 | 挂载一个后端 |
| [`plugin-inventory/`](plugin-inventory/README.md) | 当前 Loader 条目的只读投影 | Remote `pluginInventory/list` |
| [`memory/`](memory/README.md) | 本地记忆存储、提取偏好、已记录的模型提取和 Agent 召回 | `ctx.memory` |
| [`capability-manager/`](capability-manager/README.md) | 由 Settings 管理的技能目录、MCP 连接和子智能体角色 | `ctx.capabilityManager` |
| [`extensions-registry/`](extensions-registry/README.md) | 搜索 npm 中可安装的 DSH bundle | Remote `extensionsRegistry/search` |
| [`profile-manager/`](profile-manager/README.md) | 在当前 profile 中安装、更新和移除 bundle | Remote `profileManager` |

`apiproxy` 保持传输无关；[`client/connection`](../client/connection/README.md) 提供浏览器／HTTP 载体。选择器实现可在共享 seam 后互相替换。

子系统参考：[web-server.md](../../docs/subsystems/web-server.md) 与 [workspace.md](../../docs/subsystems/workspace.md)（选择器 seam）。
