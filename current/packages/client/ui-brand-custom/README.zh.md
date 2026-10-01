# @deepseek-ai/dsh-client-ui-brand-custom

[English](README.md) | 中文

自定义品牌 occupant，用于 Web 客户端的侧边栏和会话 Hero slot。当 `DSH_CLIENT_BUILD_PROFILE` 不是 `official` 时，此插件用自定义名称"嘉言成 harness"填充品牌 slot。

该插件是 `ui-brand-official` 的直接镜像，仅将品牌名称替换为自定义标签。不渲染 logo 或图标。

## 模型体验

无，因为这个仅浏览器端的呈现 occupant 不注册任何模型相关内容。

#### KV Cache effect

无；本包从不组装模型输入。

## 已知限制与暂缓事项

- **无 logo** —— 自定义品牌仅渲染文本，不提供 logo 或图标。
- **静态名称** —— 品牌名称"嘉言成 harness"是硬编码的；未来版本可接受配置值。
