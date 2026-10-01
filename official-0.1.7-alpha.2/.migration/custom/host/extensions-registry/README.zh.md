# @deepseek-ai/dsh-host-extensions-registry

[English](README.md) | 中文

面向可信客户端的 npm 扩展目录搜索。`ExtensionsRegistryGateway` 注册 `extensionsRegistry` 服务，并发布一个由 Typert 生成的直接 Remote：`extensionsRegistry/search`。该接口查询 npm registry 搜索 API（`registry.npmjs.org/-/v1/search`），按固定的 `dsh-bundle` 关键字过滤，再通过 `profileManager` 服务把结果与活动 profile 的已安装依赖做关联，返回带安装状态与版本信息的匹配包列表。

目录只是发现，不是信任：结果是普通的 npm 包，本服务既不校验也不背书它们。公开 payload 类型位于 `./types`；Typert 生成由 `./typert` 与 `./remote` 导出的 Host 和 Client Remote 产物。

## 模型体验

无，因为这个仅限 Host 的目录服务不注册提示词、工具、消息或提供方请求。

#### KV Cache 影响

无；本包从不组装模型输入。

## 已知限制与暂缓事项

- **无包详情接口** —— `search` 只返回搜索页视图；版本历史、dist-tags 与 tarball 元数据不暴露。
- **关键字过滤固定** —— `dsh-bundle` 关键字是常量而非可配置字段；更宽的目录需要配置驱动的关键字或 scope。