# @deepseek-ai/dsh-client-ui-settings-extensions

[English](README.md) | 中文

Web 设置 > 插件中的扩展市场标签页。注册一个 `settings.plugins.tab` 贡献（id `extensions`），通过生成的 `extensionsRegistry` Remote 在 npm 搜索 `dsh-bundle` 包，渲染带安装状态的卡片，并通过 `profileManager` 的 `installPackage`、`update` 与 `removePackage` Remote 驱动安装、更新与移除。成功的修改会呈现“重启后生效”提示；失败会在行内显示 pnpm 尾部输出。页面也会链接到 DSH 官方 README 推荐的 `dsh-plugin` GitHub Topic 发现入口。Topic 中的条目属于社区仓库，不是经过官方审核的目录；该链接不会直接安装 GitHub 仓库。

搜索控件和结果卡片使用现有 Settings 字体、间距与主题颜色。

## 模型体验

无，因为这个仅 UI 的包不注册提示词、工具、消息或提供方请求。

#### KV Cache 影响

无；本包从不组装模型输入。

## 已知限制与暂缓事项

- **搜索结果分页受限** —— registry 查询最多返回 25 条，无分页。
- **安装状态是快照** —— 每次搜索时才对 profile manifest 做关联；其他窗口的修改在下次搜索前不会被观察到。
- **没有配置官方插件目录 API** —— npm 搜索属于社区发现，官方 DSH Topic 目前只是外部发现链接。
