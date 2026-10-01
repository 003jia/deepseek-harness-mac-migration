# @deepseek-ai/dsh-claude-loop-alignment

[English](README.md) | 中文

面向 DeepSeek Harness 的 Claude Code agent-loop 对齐：一个可选启用的 host 插件，把 Claude Code 的循环行为叠加到 DSH 既有的扩展点上——`agent/pre-step` 瀑布、`agent/turn-stopping` 边界、工具注册表与 subagent 运行时——不触碰循环内核。所有可选服务都通过 `ctx.get()` 加 undefined 检查读取，因此缺失兄弟服务的组合里插件优雅降级，绝不会打断循环。

## 功能

- `maxToolTurns` —— 每个用户回合的工具调用预算（Claude Code `max_turns` 的类比）。达到上限后先注入停止指令运行一个宽限步骤；模型仍调用工具则拒绝下一步并结束回合。
- `snipAtRatio` —— 低成本的每回合压力检查：上下文压力超过阈值时，可选的 `toolResultPruner` 兄弟服务修剪超长工具结果（缺该服务时静默跳过）。
- `compactAtRatio` —— 通过 `ctx.compaction` 的压力压缩。`dsh-compaction-basic` 以 `auto: true` 运行时应保持为 0（它本身就会检查同一接缝）。
- `turnTokenBudget` —— Claude Code `TOKEN_BUDGET` 的类比：引导模型朝 token 目标继续工作，达到完成比例或收益递减时停止。
- `maxTokensRecoveryLimit` —— Claude Code `max_output_tokens` 恢复的类比：`max-tokens` 结束后注入续写引导，最多到上限次数。
- `snip` 工具 —— Claude Code SnipTool 的类比：模型可自行裁量丢弃最旧的历史并用一个占位符替换。
- `plan_agent` 工具 —— Claude Code PLAN_AGENT 的类比：只读的软件架构师 subagent，依赖具备 `toolFilter` 能力的 provider，子代理只能读。

## 组合方式

无硬服务依赖（`inject` 为空）；一切都可选。像任何插件一样把该包插入 host 图——CLI 应用已携带 workspace 依赖，`examples/web-cordis/cordis.yml` 已携带图行。`subagents` 服务缺失时不注册 `plan_agent` 工具并记录日志；token 计量器、LLM 运行时、压缩引擎或工具结果修剪器缺失时对应检查跳过。每会话的跟踪状态（回合预算、token 预算、max-tokens 恢复计数）为进程内状态，agent 转入空闲时重置。

## 配置

- `maxToolTurns`（整数，默认 20）—— 每个用户回合的最大工具调用步数；0 关闭预算。
- `snipAtRatio`（0–1 数值，默认 0.6）—— 触发工具结果修剪的压力比；0 关闭。
- `compactAtRatio`（0–1 数值，默认 0）—— 触发 `ctx.compaction` 压缩的压力比；0 关闭。
- `turnTokenBudget`（整数，默认 0）—— 每回合输出 token 目标；0 关闭预算引导。
- `budgetCompletionRatio`（0–1 数值，默认 0.9）—— 停止续写引导的目标完成比例。
- `budgetDiminishingDelta`（整数，默认 500）—— 判定收益递减的输出 token 增量阈值。
- `maxTokensRecoveryLimit`（整数，默认 3）—— 连续 `max-tokens` 续写引导的上限；0 关闭恢复。
- `planAgentModel`（字符串或 null，默认 null）—— plan subagent 的可选模型覆盖；null 继承父级路由。

## 模型体验

### `snip` 工具

#### 模型看到什么

一个带 `keep_recent` 与 `reason` 参数的 `snip` 工具定义，邀请模型自行裁量丢弃陈旧历史；替换占位符（`[History snipped at the model's request: ...]`）以普通用户消息进入会话记录，来源标记为 `claude-loop-alignment`。

#### Token 影响

删除最旧的表层消息并用一个小占位符替换，让后续每个请求都省下这些 token；工具结果报告删除/保留的消息数与释放的 token 估计值。

#### KV Cache 影响

对前缀是破坏性的：表层替换截断保留尾部之前的全部内容，截点之前的缓存前缀块在后续回合无法复用。

### `plan_agent` 工具

#### 模型看到什么

一个 `plan_agent` 工具定义（`instruction`、可选 `perspective`），其提示词告诉子代理它是只读软件架构师；父级在工具结果里收到 subagent 的摘要与完整计划文本块。

#### Token 影响

父级只为返回的计划文本付费——探索发生在子代理自己的上下文里，且子代理通过 provider 的 `toolFilter` 能力被限制为只读工具。

#### KV Cache 影响

对父级是追加式的：工具调用及其结果在尾部进入表层，父级的缓存前缀保持有效。

### 回合边界引导消息

#### 模型看到什么

循环边界上插件署名的用户消息：`maxToolTurns` 达到上限时的停止指令、token 预算续写引导（`Stopped at N% of token target ...`）以及 `max-tokens` 续写引导——每条都标记 `claude-loop-alignment` 来源。

#### Token 影响

每条引导消息只花几十个 token；回合预算靠策略（拒绝下一步）而非上下文增长来关闭后续工具调用。

#### KV Cache 影响

触发 snip 前是追加式的：引导消息在回合边界扩展表层，但 `snip` 调用或压力修剪会截断前缀并使截点之前的缓存块失效。

## 已知局限与后续工作

- 尚无包内测试套件——行为仅通过组合应用运行验证；预算、恢复与压力路径的单元覆盖待补。
- `snip` 工具的 `keep_recent` 下限固定（最小 1、默认 15）且不做摘要——与 Claude Code 的一致是行为层面而非 token 精确层面。
- `plan_agent` 依赖具备 `toolFilter` 的 subagent provider；缺失时不注册该工具，模型无感知（info 级日志）。
- 每会话跟踪器是以会话 id 为键的进程内 map，agent 空闲时重置；不跨重启持久化。
- 压力测量同时需要 token 计量器与 LLM 运行时——缺任一个，`snipAtRatio` 与 `compactAtRatio` 静默跳过。
