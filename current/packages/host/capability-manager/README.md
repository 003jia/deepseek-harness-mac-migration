# @deepseek-ai/dsh-host-capability-manager

English | [中文](README.zh.md)

The Host service persists settings-managed `skill`, `mcp`, and `subagent` entries in the `capabilities` settings namespace and activates each enabled entry as a Cordis fiber. Save, toggle, remove, and reconnect operations are serialized; a saved enabled flag remains distinct from the runtime states `pending`, `active`, `failed`, and `disabled`.

A skill entry points to an absolute local directory. The manager registers that directory with the skill filesystem provider and never copies or deletes the source files. An MCP entry starts either a stdio command on the Host or a Streamable HTTP connection; its JSON config includes a positive `toolCallTimeoutMs` for each tool call. Stdio commands run with the local user's process permissions and do not inherit the session workspace sandbox. HTTP headers and stdio environment values use credential references resolved through `ctx.credentials`; URL user information and credential-shaped query parameter names are rejected. A subagent entry configures the existing tool-subagent consumer and names a provider that must already be registered. External providers may run outside the local workspace sandbox.

These settings do not install npm packages or edit the active profile's bundle list. Plugin bundle installation and removal remain in the Extensions settings contribution backed by `profileManager`; successful package changes require a Host restart. Capability configuration is stored in the Host settings file, so users should only enable commands, MCP servers, directories, and providers they trust.

## Public types

`CapabilityId` identifies a saved entry. `CapabilityKind` is `skill`, `mcp`, or `subagent`. `CapabilityConfig` contains provider-specific JSON values and represents secrets only through credential references. `CapabilitySnapshot` returns each saved entry with its current activation state and any user-safe error summary.

## Model Experience

### Enabled Host capabilities

#### What the model sees

The manager's settings Remotes do not add prompt text. Enabled `skill` directories are available to the skill catalog consumer, `mcp` connections expose discovered tools, and `subagent` entries register delegation tools for later Agent requests. Stdio MCP processes execute on the Host and are outside session file sandbox enforcement.

#### Token effect

Only enabled skill context or tool declarations add model input, and the amount depends on provider results and each request's available tools.

#### KV Cache effect

Changing enabled entries can change later skill context or tool declarations and provider cache reuse; settings operations do not rewrite requests already sent.

## Known Limitations and Deferred Work

- **No package installer for skill directories** — users select an existing absolute path; adding or removing the entry never copies, updates, or deletes source files.
- **MCP health is activation status** — the page reports Cordis lifecycle state and can reconnect a fiber, but it does not provide a separate test-call interface or semantic health check.
- **Subagent providers are configured elsewhere** — this page can select an already registered provider but cannot install a provider or guarantee that its worker inherits the session sandbox.
- **Plugin bundle operations remain separate** — the package catalog and profile mutations are owned by the Extensions settings feature.
