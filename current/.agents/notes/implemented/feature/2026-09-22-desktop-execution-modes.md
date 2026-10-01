# Agent Note: Desktop execution modes separate Plan, sandbox autonomy, and access

Status: implemented

English | [中文](2026-09-22-desktop-execution-modes.zh.md)

## Problem

The new-session screen presented Agent presets as if they were execution modes, mixing plugin composition choices such as Standard, Minimal, Creator, and user-authored presets with sandbox and approval policy. Plan mode was a separate composer control, so users had no single place to choose how a task should run.

## Decision

The composer presents one execution-mode menu over the existing durable `/plan` and `/permission` commands. Plan applies `read-only` before enabling Plan mode; Auto selects `workspace-write` (`ask` approval), which permits sandboxed execution within the workspace and configured temporary directories while wider actions require approval; Autonomous (local sandbox) selects `workspace-write` (`never` approval), so permitted file operations execute without approval and actions requiring wider permission are rejected; Full access selects `danger-full-access` (`never` approval) and requires an explicit in-app risk acknowledgement. Full access is visibly identified as outside the sandbox. Each transition stops when a command fails and reports the failure, so a partial transition retains the last successfully applied command state.

The new-session header renders the Agent preset chooser beside the workspace picker as a separate composition control, not an execution mode. Agent presets remain manageable in Settings; no user-authored preset files or saved defaults are deleted or rewritten. The Settings dialog portals to `document.body`, outside the sidebar's `backdrop-filter` containing block, so its fixed panel and mask span the viewport.

## Alternatives considered

**Keep Agent presets in the execution-mode menu.** Rejected because a preset selects plugins and prompt composition, while execution modes select sandbox and approval policy; presenting them together makes their effects ambiguous.

**Keep the Plan chip beside the permission selector.** Rejected because Plan is one of the three task execution choices, and a second control would split the same choice across the composer.

**Enable Full autonomy with a direct menu pick.** Rejected because `danger-full-access` runs without sandbox restrictions or approval prompts; the acknowledgement keeps that change deliberate and visible.

## Consequences

The displayed mode choices follow the host's composed permission options, and Plan appears only when the host also exposes Plan mode. Session history continues to record the underlying Plan, sandbox, approval, and permission events through their existing owners. `sandbox-autonomy` does not expand the local file policy; network access, Host plugins, MCP processes, and external subagent workers keep the limits of their own providers and are not described as inheriting the session sandbox. A failed multi-command transition is not atomic; the UI reports failure and retains whichever earlier command succeeded, including a more restrictive permission when Plan entry fails after `read-only` is applied.

The Agent preset chooser remains beside the workspace picker, separate from the execution-mode menu. Users can inspect or maintain compositions in Settings.

## Testing

No test, build, or desktop launch was run for the sandbox-autonomy extension in this change. The prior Plan, Auto, and Full access UI flow remains covered by the existing InputBar, SettingsRoot, and assembled Web scenario; the new mode still needs the real local executor and out-of-scope rejection acceptance before platform behavior is claimed.
