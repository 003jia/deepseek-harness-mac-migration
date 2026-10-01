# @deepseek-ai/dsh-host-update-check

[English](README.md) | 中文

检查官方 DeepSeek Harness 仓库 `deepseek-ai/deepseek-harness` 的 GitHub Releases。`UpdateCheckGateway` 注册 `updateCheck` 服务，并发布一个由 Typert 生成的直接 Remote：`updateCheck/check`。该接口读取该仓库的 GitHub Releases API，忽略草稿和无效版本标签，并报告当前安装版本是否早于最新的已发布语义化版本。结果还会携带规范的官方发布链接、发布时间，以及在存在时适用于当前桌面平台和架构的一项官方 GitHub 安装包资产。GitHub 提供 SHA-256 摘要时，结果也会携带该摘要。外部 URL 只有属于官方仓库 GitHub 发布路径、并指向所报告的发布资产时才会被接受。当前版本在构造时从已安装包的 `package.json` 解析，或通过配置显式提供。

本服务只比较版本，不下载也不安装任何东西。公开 payload 类型位于 `./types`；Typert 生成由 `./typert` 与 `./remote` 导出的 Host 和 Client Remote 产物。

## 模型体验

无，因为这个仅限 Host 的检查不注册提示词、工具、消息或提供方请求。

#### KV Cache 影响

无；本包从不组装模型输入。

## 已知限制与暂缓事项

- **不执行更新** —— 本包只检查官方发布版本；下载和应用更新不在其范围内。
