# Agent Note：桌面端执行模式区分 Plan、沙箱自主与完全访问

Status: implemented

[English](2026-09-22-desktop-execution-modes.md) | 中文

## 问题

新建会话界面把 Agent preset 当作执行模式展示，将 Standard、Minimal、Creator 与用户自定义 preset 等插件组装选项和沙箱、审批策略混在一起。Plan mode 又是独立的 composer 控件，用户无法在一个入口中选择任务如何运行。

## 决策

composer 通过现有、可持久记录的 `/plan` 与 `/permission` 命令提供统一执行模式菜单。计划模式先应用 `read-only` 再启用 Plan mode；自动模式选择 `workspace-write`（审批策略为 `ask`），允许在工作区和配置的临时目录沙箱中执行，超出范围的操作仍需审批；自主（本地沙箱）选择 `workspace-write`（审批策略为 `never`），因此沙箱允许的文件操作无需审批即可执行，而需要更宽权限的操作会被拒绝；完全访问选择 `danger-full-access`（审批策略为 `never`），且必须先在界面中明确勾选风险确认。完全访问会明确显示为无沙箱。任一命令失败后都停止后续切换并报告错误，因此部分切换会保留最后成功执行的命令状态。

新建会话标题区会在工作区选择器旁显示独立的 Agent preset 选择器；它用于选择插件组装，不属于执行模式。Settings 仍可管理 preset；不会删除或改写用户自定义 preset 文件或已保存的默认值。Settings 弹窗通过 portal 挂载到 `document.body`，脱离侧边栏 `backdrop-filter` 建立的包含块，使固定定位面板和遮罩覆盖整个视口。

## 曾考虑的替代方案

**继续在执行模式菜单中列出 Agent preset。** 否决：preset 选择插件与提示词组装，执行模式选择沙箱与审批策略；混为一谈会让两者的效果含糊不清。

**在权限选择器旁保留独立 Plan chip。** 否决：Plan 是三种任务执行选择之一，再放一个控件会把同一选择拆散在 composer 的两个位置。

**从菜单直接启用全自主模式。** 否决：`danger-full-access` 不受沙箱限制且没有审批提示；风险确认能使这项变更明确且由用户主动启用。

## 后果

菜单选项遵循 host 实际组合的权限预设；只有 host 同时提供 Plan mode 时才显示计划模式。`sandbox-autonomy` 不会扩大本地文件策略；网络访问、Host 插件、MCP 进程和外部子智能体 worker 仍受各自 provider 的限制，界面不会声称它们继承了会话沙箱。会话历史仍由各自既有 owner 记录 Plan、沙箱、审批与权限事件。多命令切换不是原子操作；失败时界面会报告错误，并保留先前成功的命令状态，包括应用 `read-only` 后 Plan 启用失败时保留更严格权限的情形。

Agent preset 选择器位于工作区选择器旁，与执行模式菜单分开。用户仍可在 Settings 中查看或维护组装。

## 测试

本次沙箱自主扩展没有运行测试、构建或桌面启动。既有 Plan、Auto 与 Full access UI 流程仍由 InputBar、SettingsRoot 和组装态 Web 场景覆盖；新模式仍需使用真实本地执行器验收越界拒绝后，才能报告平台行为已通过验证。
