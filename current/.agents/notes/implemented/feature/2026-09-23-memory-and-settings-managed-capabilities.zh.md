# Agent Note: 本地 Memory 与 Settings 能力管理

Status: implemented

[English](2026-09-23-memory-and-settings-managed-capabilities.md) | 中文

## 问题

用户需要控制已保存事实是否进入后续模型请求，选择是否从已完成轮次提取长期记忆，并在无需手改 profile 的情况下管理常用本地能力。这些控件还必须说清楚模型调用和可执行 MCP 进程在哪里运行。

## 决策

Host 将本地 Memory 保存在已配置的 storage-domain 后端中，并与会话历史分开管理。`enabled` 默认关闭；`autoExtract` 默认开启，但只有 Memory 启用时才生效。每次成功的 `turn/end` 后，自动提取当前轮的用户消息，并使用对话所记录的模型路由调用 `purpose: 'memory'`；辅助请求的准确输入和结果均写入日志。召回会按配置的字符上限加入最新共享事实和工作区路径完全匹配的事实。用户可以手动提取已加载对话，也可查看、编辑和删除条目。删除会记录内容 tombstone；关闭 Memory 会保留数据和设置，但会阻止后续提取与召回。

Settings 在可折叠的“能力扩展”分组下提供“技能”“MCP”和“子智能体”三个独立页面。Host capability manager 会串行处理变更、持久化非密钥配置，并分别报告保存的启用状态和运行时挂载状态。技能条目注册已存在的绝对目录，不复制或删除源文件。MCP 条目会在 Host 启动 stdio 命令或连接 Streamable HTTP，并通过引用解析凭据。子智能体条目使用已注册的 provider。现有“插件”设置区继续管理插件配置卡片，以及 npm bundle 的安装、更新和移除。

插件 Extensions 标签会链接到 DSH 官方 README 推荐用于发现插件的 `dsh-plugin` GitHub Topic。Topic 仓库和 npm 搜索结果都属于社区来源；当前 checkout 不声称存在官方审核目录或可直接调用的官方 registry API。GitHub Topic 链接只用于发现，不会直接安装仓库。

## 考虑过的替代方案

**把已保存的会话历史当作 Memory。** 不采纳，因为用户需要独立控制哪些事实注入后续请求，而会话日志仍由既有保留与回放 owner 管理。

**默认使用第三方 MCP 记忆服务。** 不采纳，因为本地 Memory 应无需外部进程、账户或单独存储配置即可工作；用户仍可选择通用 MCP 来接入外部服务。

**第一版就为每类能力制作专属设置 schema。** 不采纳，先用统一 JSON 编辑器接入现有 Host provider，并按能力类别校验字段和提供示例；后续专用表单无需改变 provider 所有权。

**把 GitHub Topic 称作官方插件目录。** 不采纳，因为官方 README 只建议用它发现插件，而该 Topic 收录的是社区仓库。在官方目录及其安装约定得到核实之前，npm 搜索仍标为社区发现。

## 后果

Memory 提取会消耗当前对话所选提供方的账户、费用和模型调用；关闭后会停止新调用，但无法从已发送请求或会话日志中删除事实。模型提取结果需要用户审核，召回依赖精确工作区匹配和更新时间，凭据识别为启发式规则。技能条目引用 Host 路径；stdio MCP 进程使用本机用户权限运行，处于对话文件沙箱之外；外部子智能体 provider 不保证继承该沙箱。在当前 checkout 中，插件 bundle 操作仍影响整个 profile，安装或移除成功后需重启 Host。

本功能对[第三方记忆 MCP 示例](2026-07-31-third-party-memory-mcp-examples.md)中关于负面范围的说明作了部分更新：那些示例仍不提供记忆专用安装器、provider 服务、迁移或支持政策；本地 Memory 服务和通用 MCP 设置属于独立功能。[桌面执行模式决策](2026-09-22-desktop-execution-modes.md)负责沙箱自主选项及其权限映射。

## 测试

本地 Cordis 配置、客户端包依赖、包不变量、已构建不变量伴随插件、Host 与客户端 TypeScript 编译、Web 构建，以及 139 项聚焦 UI/插件测试均已通过。Electron 桌面端使用当前 Web profile 启动；插件列表显示 Memory 与能力管理器已挂载，Memory、技能、MCP、子智能体和插件设置页均已渲染。本地模型提取、Memory 四种开关组合、真实 MCP 连接与工具调用、provider 子智能体调用、插件安装与重启流程，以及本地沙箱越界拒绝仍未完成验收。
