# @deepseek-ai/dsh-client-ui-settings-capabilities

[English](README.md) | 中文

为 Host capability manager 中的 `skill`、`mcp` 和 `subagent` 条目分别注册一个 Settings 分区。这三个导航项共享可折叠的**能力扩展**分组。每个页面都可编辑 JSON 配置，分别显示已保存状态与运行时挂载状态，并提供启用、停用、编辑、移除，以及适用时的重连操作。

这些分区使用 Settings 共用的字号层级和主题颜色；JSON 编辑器使用应用内的代码字体。

技能配置选择一个已存在的绝对本地目录。MCP 配置支持 stdio 与 Streamable HTTP；stdio 会以本机用户权限在 Host 上启动命令，处于会话文件沙箱之外。密钥应使用凭据引用，不能直接放入 JSON。子智能体配置选择一个已注册的 provider，不能承诺外部 worker 继承沙箱限制。插件目录仍位于“插件”设置页的独立标签中，并将 npm bundle 安装到当前 profile。

## 模型体验

### 已启用的能力

#### 模型可见内容

设置页面只发送 Host Remote 请求。在之后的 Agent 请求中，已启用的 `mcp` 连接会提供发现到的工具，已启用的 `subagent` 条目会提供委派工具，已注册的 `skill` 目录可供技能目录 Consumer 使用。

#### Token 影响

页面本身不增加请求 token。工具声明和技能目录内容取决于已启用条目及其 provider 配置。

#### KV Cache effect

保存、启用或移除条目可能改变之后的工具声明或技能上下文，因此会影响提供方缓存复用；设置页面不会组装模型输入。

## 已知限制与暂缓事项

- **配置使用 JSON**：本页面不提供逐字段表单、导入、导出或技能包安装。
- **MCP 连通性只反映生命周期**：重连会重启配置的 fiber，但不会运行独立工具探测。
- **Provider 需要预先配置**：子智能体角色只能使用 Host 组合中已经注册的 provider。
