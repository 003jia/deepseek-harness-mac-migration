# @deepseek-ai/dsh-host-profile-manager

[English](README.md) | 中文

面向可信客户端的事务式 profile 包管理。`ProfilePackageManager` 注册 `profileManager` 服务，并发布四个由 Typert 生成的直接 Remote：`snapshot`、`installPackage`、`update` 与 `removePackage`。每个修改操作都会在活动 profile 目录（由 `ctx.baseUrl` 推导）中运行对应的 `pnpm` 命令，然后按安装状态对 `dsh.profile.bundles` 层列表做对账（与 `dsh plugin` 完全一致），pnpm 失败时恢复捕获的 manifest。操作在进程内串行；每次成功修改都返回 `restartRequired: true`，因为 bundle 只在启动时生效。

只接受 registry 包规格 —— 路径、URL 与 git 规格一律拒绝 —— 因为该接口只服务于 registry 市场，绝不透传任意的包管理器参数。公开 payload 类型位于 `./types`；Typert 生成由 `./typert` 与 `./remote` 导出的 Host 和 Client Remote 产物。

## 公共类型

`ProfileSnapshot` 报告活动 profile 目录、有序 bundle 层和已安装依赖版本。`PackageOperationResult` 标识一次安装、更新或移除操作，并报告成功状态、错误详情和重启要求。

## 模型体验

无，因为这个仅限 Host 的包管理器不注册提示词、工具、消息或提供方请求。

#### KV Cache 影响

无；本包从不组装模型输入。

## 已知限制与暂缓事项

- **仅进程内串行** —— 操作队列串行化本服务的调用，但不锁并发运行的 `dsh plugin` CLI 进程。
- **无自动重启** —— dsh 无法自行重启；由客户端呈现重启要求，用户手动重启。
- **回滚只覆盖 manifest** —— pnpm 失败时恢复 `package.json`，但不会卸载部分写入的 `node_modules` 内容。
