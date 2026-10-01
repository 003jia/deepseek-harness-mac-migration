# DeepSeek Harness：沙箱自主执行、Memory 与能力扩展计划

状态：核心源码已写入本地工作树，尚未完成集成验收。更新日期：2026-09-23。核对基线：本地 `master` / `141eb6fef8` 及当前未提交改动。当前完成情况以复选框为准；本轮没有运行测试、构建或真实桌面操作。

## 1. 范围与目标

本计划覆盖桌面端共用的 Web 设置和 Host 能力：自主模式在本地沙箱内自动执行；按图 1 增加 Memory 总开关与自动提取子开关；按图 2 提供插件、技能、MCP、子智能体四类扩展管理。用户已明确“自主拓展”指在设置中自行安装、配置和管理，本期不加入 Agent 自动安装扩展。

截图用于确定界面层级和开关语义。实现继续通过 Cordis 插件、Settings、Remote 和会话事件扩展，复用现有执行循环。实施前确认桌面实际启动的 profile、bundle 和本地 link 包，避免修改未被加载的同名插件。

## 2. 已核实的现状

| 范围 | 当前实现 | 本期缺口 |
| --- | --- | --- |
| 执行模式 | [PermissionSelect](../../packages/client/ui-conversation/src/client/skeleton/PermissionSelect.tsx) 提供 Plan、Auto、Autonomous（local sandbox）和 Full access，分别映射既有权限预设 | `sandbox-autonomy` 使用 `workspace-write + never`；真实本地执行器与越界拒绝尚未验证 |
| 权限与审批 | [permission-presets](../../packages/interaction/permission-presets/README.md) 组合文件沙箱与审批策略；[user-approval](../../packages/interaction/user-approval/README.md) 的 `never` 会拒绝需要审批的请求 | 不能把 `never` 当成“所有操作自动批准” |
| 本地沙箱 | [sandbox-local](../../packages/sandbox/sandbox-local/README.md) 已支持 macOS Seatbelt、Linux、Windows 执行器；[sandbox-policy](../../packages/sandbox/sandbox-policy/README.md) 统一会话工作目录与文件策略 | 当前主要限制文件写入，不等于网络、文件读取或宿主插件隔离；还需验证桌面的真实执行链 |
| 设置框架 | [SettingsRoot](../../packages/client/ui-settings-general/src/client/SettingsRoot.tsx) 通过 section slots 提供设置导航 | 新增可折叠分组元数据；原有 section id 和跳转保持不变 |
| Memory | 新增 [Host Memory](../../packages/host/memory/README.md) 与 [设置页](../../packages/client/ui-settings-memory/README.md)，接入 storage-domain、模型提取和会话事件 | 未完成真实模型提取、重启恢复和删除/关闭竞态验收 |
| 插件市场 | [extensions-registry](../../packages/host/extensions-registry/src/index.ts) 查询 npm `dsh-bundle` 包；设置页链接到 DSH README 推荐的 `dsh-plugin` Topic | Topic 是社区发现入口；没有接入官方审核目录或独立官方 Registry API |
| 插件安装 | [profile-manager](../../packages/host/profile-manager/README.md) 与 [设置扩展页](../../packages/client/ui-settings-extensions/README.md) 提供当前 profile 的安装、更新和移除 | 当前不支持 Topic 仓库直接安装；bundle 操作后需重启，插件启停状态尚未单独管理 |
| 技能、MCP、子智能体 | 新增 [Capability Manager](../../packages/host/capability-manager/README.md) 与 [设置页](../../packages/client/ui-settings-capabilities/README.md)，调用现有 provider | 已实现 JSON 配置、挂载、启停和重连接口；真实连接/调用仍未验证；外部子智能体不承诺继承沙箱 |

上述多个文件属于已有未提交改动。实施时先记录相关文件基线，保留其他工作的修改；现有[桌面执行模式计划](IMPLEMENTATION_PLAN.md)中的验证记录仅作为历史线索，本次变化需要重新验证受影响行为。

## 3. 自主模式：在本地沙箱内自动执行

### 模式设计

| 用户看到的模式 | 文件权限 | 审批策略 | 行为 |
| --- | --- | --- | --- |
| 计划 | `read-only` + Plan | `ask` | 先分析、列计划 |
| 自动 | `workspace-write` | `ask` | 沙箱内执行；需要扩大权限时请求审批 |
| 自主（本地沙箱） | `workspace-write` | `never` | 允许的操作自动执行；越界操作拒绝并返回原因，不等待审批、不自动退出沙箱 |
| 完全访问（高级选项） | `danger-full-access` | `never` | 明确标示无文件沙箱，保留独立的风险确认 |

新增具名 preset `sandbox-autonomy`，复用已有 `/permission`、`/plan` 和持久化事件。它与“自动”共用文件写入范围，但在遇到越界操作时直接拒绝。现有完全访问会话必须继续准确显示实际权限，不能仅改标签后伪装成已启用沙箱；用户主动切换才应用新策略。

### 实施事项

- [x] 将 preset 配置、会话菜单和中英文文案一起更新；菜单区分 `workspace-write + ask`、`workspace-write + never` 与 `danger-full-access + never`。
- [ ] 显示当前工作目录与执行器的实际沙箱能力；桌面运行路径尚未验证。
- [ ] 核对 Bash、文件工具、终端、适用的本地子进程确实消费同一会话策略；外部 Codex/Claude 子代理、MCP、Host 插件分别展示其执行权限，未验证的能力不能声称继承沙箱。
- [ ] 沙箱不可用时停止该执行路径并显示 `SANDBOX_UNAVAILABLE`，不回退到无沙箱运行；部分隔离的执行器显示实际能力。
- [ ] 处理切换期间的运行任务：阻止产生新调用，结束或重建权限不再匹配的长期终端/子进程后，才显示切换完成。取消与失败保留真实状态。
- [ ] 沿用现有循环和中止机制；连续越界或重复失败时结束当前尝试并说明阻塞原因，避免自主循环重复重试。

本期交付定义为“本地文件写入沙箱内的自主执行”。网络隔离不属于现有 `SandboxMode`，如后续需要，应另设网络策略及平台验收，不能通过修改模式说明宣称已实现。

## 4. Memory：开关、自动提取与本地管理

### 图 1 对应的交互

在设置中增加“记忆”页面：第一行“启用 Memory”；第二行以缩进、左侧竖线显示“启用 Memory 自动提取”，附“依赖启用 Memory”的说明。页面另有记忆列表及手动提取入口。

| 总开关 | 自动提取设置 | 实际行为 |
| --- | --- | --- |
| 关闭 | 任意，保留原值 | 后续请求不注入已存记忆，不生成 Memory 提示词；自动和手动提取均不可用；已有记忆保留 |
| 开启 | 关闭 | 可使用已有记忆、手动提取和管理记忆；不执行自动提取 |
| 开启 | 开启 | 使用已有记忆，按触发规则自动提取并保存 |

建议首次由用户启用 Memory 时同时开启自动提取；升级不自动扫描历史会话。切换总开关不会清空自动提取偏好。已发送给模型的内容无法撤回，开关对后续请求生效；历史会话日志与长期记忆存储分别管理。

### 记忆内容与处理规则

- 提取稳定的用户偏好、长期目标、项目约定和已经确认的事实；不把整段聊天或每轮回答直接存成记忆。
- 保存内容、类别、用户或项目作用域、来源会话及事件位置、创建/更新时间、自动或手动来源。模型猜测、未确认结论和引用材料中的指令不得提升为用户偏好。
- 默认将项目事实保存在当前项目作用域；跨项目偏好要有明确依据。过滤凭据、密钥、一次性验证码等内容，错误输出和临时执行状态不作为长期事实。
- 使用内容去重及来源事件游标防止重复写入；明确更正可替换旧值，不明确的冲突保留来源并交由用户修订。删除后的记忆不被同一段历史再次自动提取。
- 列表支持查看、编辑、删除、按作用域筛选以及手动提取当前会话。删除影响后续检索和注入，不声称抹除已有会话日志。

### 实现方案

- [x] 新增 Host Memory 服务、本地 storage-domain 持久化和 Agent Consumer，无需外部 MCP 服务器或向量数据库即可使用。
- [x] Settings 持久化两个独立布尔值，Host 强制执行总开关与自动提取的依赖关系。
- [ ] 每轮完成后对尚未处理的有效对话增量排队提取；配置最小内容阈值、节流、单次预算、超时和批量上限，所有可调项由插件 Config 管理。
- [x] 提取使用当前对话记录的模型路由，日志保存准确请求、结果状态和可用用量；任务排队不阻塞聊天，也不重新唤醒 Agent 循环。模型请求遵循所选 Provider 的运行位置。
- [ ] 队列幂等处理重启、重复 turn 事件和并发会话；关闭开关后取消未开始任务，运行中任务提交前再检查开关及数据版本，避免晚到结果重新保存已删除内容。
- [x] 召回只选共享与当前工作区作用域的有限条目，作为 Agent 输入上下文；关闭后不再生成新 Memory 上下文。
- [x] 新增 Memory 设置页和 Host Remote，并注册到 Web bundle；外部 MCP 记忆不是本期前置依赖。

## 5. 能力扩展：按图 2 提供四类管理

设置侧栏增加可展开的“能力扩展”分组，包含“插件 / 技能 / MCP / 子智能体”。复用现有 Settings slot 机制；导航分组由通用元数据表达，各功能仍由自身插件注册，现有 section id 和跳转继续有效。

| 页面 | 本期功能 | 验收闭环 |
| --- | --- | --- |
| 插件 | 现有插件配置卡片与 npm bundle 搜索、安装、更新、移除；提供官方 README 所推荐的 Topic 发现链接 | 当前 Topic 仅为发现页，npm 结果为社区包；未完成直接从仓库安装、插件启停及实际重启验收 |
| 技能 | 可配置已存在的绝对本地技能目录、查看状态、启停、编辑、移除 | 源目录可发现和调用、停用后的有效目录变化尚未实机验收；不导入/复制源文件 |
| MCP | 可新增/编辑 stdio 与 Streamable HTTP 配置、启停、重连和查看状态；凭据使用引用 | 真实连接、工具发现与调用，以及停用后的断开状态尚未验收；stdio 在 Host 执行且不继承会话沙箱 |
| 子智能体 | 可配置已有 provider、角色提示、模型、工具过滤和深度，启停并查看状态 | 尚未验证真实子任务调用、取消与结果回收；不提供 provider 安装或沙箱继承承诺 |

外部子智能体运行时需单独显示是否可用及其权限限制；无法透传沙箱约束时禁止标注“继承本地沙箱”。现有 Agent preset 保留为会话组合配置，避免将它直接改名为子智能体。

所有管理写入经 Host 服务校验与串行处理，显示实际完成的阶段：已保存、安装中、已安装、已启用、待重启或失败。失败保留错误及可重试状态，不能仅根据依赖存在就显示启用成功。插件安装影响当前 profile，需提示受影响范围；管理操作不会因为会话处于自主模式而自动获得授权。

## 6. 对接 DSH 官方插件来源

2026-09-22 查阅的[官方 README](https://github.com/deepseek-ai/deepseek-harness#community-and-support)将 `dsh-plugin` GitHub topic 作为插件发现入口，它属于社区发现机制。官方当前[插件管理说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/plugin-manager/README.md)提供 registry 配置与 bundle 管理；本地尚无该包。以上证据不能证明存在独立、受官方审核的插件市场 API。

- [x] 核对 DSH 官方 README：它推荐 GitHub `dsh-plugin` Topic 用于发现；该 Topic 是社区列表，不是官方审核目录。当前 README 没有给出独立官方目录 API。
- [ ] 评估官方仓库当前的 plugin-manager 与本地 checkout 版本差异，再决定是否移植；本期没有升级整个脏工作区或假设兼容上游包。
- [x] 在设置页将 Topic 发现入口与 npm 搜索分开呈现，并明确说明两者均不能据此认定发布者已获官方认证。
- [ ] 若官方发布独立目录和可验证 API，再增加直接目录适配、刷新状态与安装流程；当前无可连接的官方 API。
- [ ] 安装前检查包身份、版本、`dsh.bundle` 声明和 peerDependencies。官方来源若使用 GitHub bundle，复用经过验证的 CLI spec 解析和安装机制，并明确当前 registry-only API 所需的扩展。
- [ ] 下载、构建脚本、写入 profile 和运行 Host 插件分别展示状态；构建脚本授权独立处理。Host 插件在宿主进程内运行，不纳入会话文件沙箱的保护承诺。
- [ ] 安装失败恢复声明文件和锁文件，记录下载残留及实际恢复范围；更新保留可回退版本，卸载不删除用户配置和插件数据。实现跨 UI/CLI 的 profile 写入协调。

若官方独立目录未核实，交付可配置的来源适配与已核实的官方安装途径，并将“独立官方目录接入”保留为未完成项；不能以社区搜索替代后勾选完成。

## 7. 实施顺序、目标位置与决策点

新增包名为建议名称，实施时按职责和真实复用关系确定，不为保持表格而强行拆包。

| 阶段 | 任务与目标位置 | 前置条件 / 完成条件 |
| --- | --- | --- |
| P0：基线核实 | 桌面启动入口、活动 profile、已有本地插件；核实官方来源 | 桌面当前执行路径与 profile 尚未确认；官方 Topic 入口已核对，不重写用户配置 |
| P1：沙箱自主模式 | permission-presets、ui-conversation、bundle/base | preset 与 UI 已实现；需验证真实本地执行、越界拒绝、切换任务及长期进程 |
| P2：Memory | 新增 `packages/host/memory`、`packages/client/ui-settings-memory`；复用 settings、storage、session、llm | 保存/编辑/删除、设置 Remote 和自动提取代码已实现；真实模型与恢复验收未完成 |
| P3：扩展导航与插件 | ui-settings slot metadata、ui-settings-general、ui-settings-extensions、extensions-registry、profile-manager | 分组与 npm 管理已实现；独立官方目录 API 未发现，GitHub Topic 仅作发现链接 |
| P4：技能、MCP、子智能体管理 | 新增 `packages/host/capability-manager` 与 `packages/client/ui-settings-capabilities`；复用现有 providers | 配置、启停、重连和状态代码已实现；真实调用与沙箱关系待验收 |
| P5：集成验收 | bundle/web-app、api/remotes、TS 编译引用、双语文档、会话 SDK 投影 | 代码和包引用已接入；本轮未运行检查、Web 场景或桌面真实入口；SDK 输出影响需按实际 bundle 覆盖确认 |

三个决策点已有实现方向：P1 主菜单采用“自主（本地沙箱）”；P2 Memory 按当前会话模型提取并按共享/工作区保存；P3 当前官方 README 提供的只是社区发现 Topic，直接官方目录接入等待官方接口或新证据。

## 8. 验收清单

### 本地沙箱

- [ ] 自主模式自动修改临时测试工作区内文件；越界写入明确拒绝，外部哨兵文件保持不变。
- [ ] 沙箱不可用、命令失败、符号链接越界、切换权限、取消长期进程分别有覆盖；没有静默降级和孤儿进程。
- [ ] 两个不同工作目录会话互不获得额外写权限；重启恢复真实权限；旧完全访问会话仍显示其实际状态。

### Memory

- [ ] 总开关与自动提取开关的四种组合均符合表格；关闭、重开、刷新和重启均保留设置与已有记忆。
- [ ] 在会话 A 表达一条稳定偏好，自动提取后会话 B 可检索；关闭自动提取不新增记忆，已有记忆仍可使用。
- [ ] 重复对话不重复保存，项目记忆不串项目；手动更正、删除、运行中关闭及失败重试均有验证。
- [ ] 自动提取真实调用配置的模型并保存有效结果；模型可见记忆能从会话日志回放。Mock 测试不替代此验收。

### 扩展与设置

- [ ] 四个设置入口均可进行真实管理，状态经刷新/重启一致；插件安装与启用、MCP 连通与工具可用分别验证。
- [ ] 官方来源、社区来源和自定义来源标识准确；官方目录未核实或不可用时不伪造成功状态。
- [ ] 网络失败、无效包、版本不兼容、取消安装、并发修改及待重启状态均能给出准确结果和恢复路径。
- [ ] 对照两张参考图验证缩进、说明文案、导航层级、开关禁用状态；覆盖中英文、键盘操作及窄窗口。
- [ ] 桌面真实启动路径完成一轮“选择沙箱自主→任务执行→形成记忆→新会话复用→管理扩展”的验收。

## 9. 验证与交付要求

完成实现后按改动范围运行 focused Vitest、对应 TypeScript 编译和构建。模型或用户可见行为需新增真实 runnable example 的 keyless snapshot；Memory 真实模型提取、沙箱真实越界测试、插件真实安装和桌面交互单独记录证据。平台能力只报告实际验证的平台，CI 承担完整平台矩阵。本次根据当前工作指令没有运行测试、类型检查、构建、doc-sync 或桌面操作，所有实机验收项仍未勾选。

涉及会话事件的变化需评估 TypeScript 与 Python SDK 投影，并更新对应期望输出；涉及公共类型与插件配置的变化同步 README、JSDoc、子系统文档和生成目录。已补充 Memory/能力管理 Agent Note，并更新执行模式 Agent Note。检查与快照仍待后续执行；没有实际证据的验收项保持未勾选。

本次源码已写入工作树，但未启动应用、未安装插件、未运行真实模型提取、测试、构建或文档门禁；不把已有计划的测试结果计入本期。
