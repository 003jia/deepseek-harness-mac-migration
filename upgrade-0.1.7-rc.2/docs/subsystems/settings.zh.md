# 插件配置表单

[English](settings.md) | 中文

[设置服务](../../packages/settings/settings/README.zh.md) 从活动 profile 条目投影 volatile Config 字段。[配置编辑器](../../packages/boot/config-editor/README.zh.md) 通过 Cordis patch 持久化编辑。业务消费者对自己的 Config 引用调用 `.get()`。

## 标识与值

表单命名空间是当前 profile 中可唯一定位条目的本地 id。多个插件实例在条目 id 不同时拥有独立表单。普通字段被排除。描述符包含实际值、继承值、显式 profile 覆盖值和乐观修订号。

## 编辑

`update` 合并提交的字段。`replace` 先将即时字段重置为继承配置，再应用提交的字段。`mutate` 操作独立路径，保留客户端响应中未包含的秘密值。每次写入都会验证完整 Config，并在持久化前拒绝过期修订号。

`settings/document-updated` 在 Loader 配置变化后使表单描述符失效。这是 UI 通知；消费者仅在需要刷新注册信息时使用 `loader/volatile-update`。

## 托管能力与记忆

[能力管理器](../../packages/host/capability-manager/README.zh.md)持久保存技能、MCP 和子代理条目。`CapabilityId` 标识已保存条目；`CapabilityKind` 选择其类别；`CapabilityConfig` 保存提供方专属 JSON 值。`CapabilitySnapshot` 返回条目的启用设置和独立的运行状态。

[记忆服务](../../packages/host/memory/README.zh.md)保存项目范围和明确共享的事实。`MemoryId` 按范围和规范化内容标识事实。`MemorySnapshot` 返回偏好设置、事实和提取状态。记忆数据由本地存储域保存，而非 volatile 设置表单。

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.zh.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxcapabilitymanager--capabilitymanager"></a>

### `ctx.capabilityManager` — `CapabilityManager`

Lifecycle owner for capabilities created explicitly from Settings.

```ts cordis-catalog
/**
 * Return saved entries with their current activation state.
 * @returns the current capability snapshot.
 */
@Remote snapshot(): CapabilitySnapshot

/**
 * Save one validated capability and settle its resulting activation.
 * @param id - existing identity, or null to add.
 * @param kind - capability family.
 * @param name - user-facing name.
 * @param config - family-specific JSON configuration; credentials use references.
 * @param enabled - whether to activate it.
 * @returns the saved directory and actual activation states.
 */
@Remote async save( id: CapabilityId | null, kind: CapabilityKind, name: string, config: CapabilityConfig, enabled: boolean, ): Promise<CapabilitySnapshot>

/**
 * Enable or disable an existing capability without deleting its configuration.
 * @param id - saved identity.
 * @param enabled - target state.
 * @returns actual activation state after reconciliation.
 */
@Remote async toggle(id: CapabilityId, enabled: boolean): Promise<CapabilitySnapshot>

/**
 * Disconnect and remove one managed configuration, retaining original skill files.
 * @param id - saved identity.
 * @returns remaining configurations.
 */
@Remote('removeEntry') async remove(id: CapabilityId): Promise<CapabilitySnapshot>

/**
 * Reload a capability and report its connection or activation result.
 * @param id - saved identity.
 * @returns refreshed status.
 */
@Remote async reconnect(id: CapabilityId): Promise<CapabilitySnapshot>
```

Source: [`packages/host/capability-manager/src/index.ts`](../../packages/host/capability-manager/src/index.ts)

<a id="ctxmemory--localmemory"></a>

### `ctx.memory` — `LocalMemory`

Host-owned memory service; no external memory server is required.

```ts cordis-catalog
/**
 * Return current preferences, stored facts, and extraction status.
 * @returns the current memory snapshot.
 */
@Remote snapshot(): MemorySnapshot

/**
 * Save the two independent preferences; disabling memory retains its data.
 * @param enabled - use memory in subsequent requests.
 * @param autoExtract - extract new turns while memory is enabled.
 * @returns committed settings and data.
 */
@Remote async preferences(enabled: boolean, autoExtract: boolean): Promise<MemorySnapshot>

/**
 * Add or edit one user-authored fact.
 * @param id - existing identity, or null to add.
 * @param workspace - project path, or empty for explicitly shared memory.
 * @param content - new fact text.
 * @returns committed snapshot.
 */
@Remote async save(id: MemoryId | null, workspace: string, content: string): Promise<MemorySnapshot>

/**
 * Delete a fact and suppress automatic rediscovery of its content.
 * @param id - saved fact identity.
 * @returns committed snapshot.
 */
@Remote('deleteEntry') async remove(id: MemoryId): Promise<MemorySnapshot>

/**
 * Extract unprocessed user messages from a loaded conversation.
 * @param sessionId - source conversation identity.
 * @returns the stored result and current extraction status.
 */
@Remote async extract(sessionId: SessionId): Promise<MemorySnapshot>
```

Types: [SessionId](core.zh.md)

Source: [`packages/host/memory/src/index.ts`](../../packages/host/memory/src/index.ts)

<a id="ctxsettings--settingsforms"></a>

### `ctx.settings` — `SettingsForms`

Project Config schemas into forms and own optional instance-level UI policy.

```ts cordis-catalog
/** Register the calling plugin instance's page policy without changing its Config.
 * @param presentation Automatic-page policy for this instance; `auto` defaults to true.
 * @param owner Plugin instance the policy belongs to; defaults to the calling fiber.
 * @returns Disposer; register it with the calling plugin's effects.
 * @throws If this instance already has a registered policy.
 */
configure(presentation: { auto?: boolean }, owner: Fiber = this.ctx.fiber): () => void

/** Locate the profile patch for native editing.
 * @returns The existing profile patch path.
 */
prepareDocument(): Promise<string>

/** Read active plugin schemas and their live values.
 * @param options Redaction required for remote callers.
 * @returns Forms keyed by unique profile entry ids.
 */
describe(options?: SettingsDescribeOptions): SettingsDescriptor[]

/** Merge editable fields into an entry's config.
 * @param ns Profile entry id.
 * @param patch Fields to merge.
 * @param expectedRevision Revision returned by describe.
 */
async update(ns: string, patch: object, expectedRevision?: number): Promise<void>

/** Reset all live fields, then set the supplied fields; ordinary config is preserved.
 * @param ns Profile entry id.
 * @param section Complete form values.
 * @param expectedRevision Revision returned by describe.
 */
async replace(ns: string, section: object, expectedRevision?: number): Promise<void>

/** Apply field edits without restating redacted secrets; unsetting an array index removes its element.
 * @param ns Profile entry id.
 * @param ops Ordered form edits.
 * @param expectedRevision Revision returned by describe.
 */
async mutate(ns: string, ops: readonly SettingsPathOp[], expectedRevision?: number): Promise<void>
```

Source: [`packages/settings/settings/src/index.ts`](../../packages/settings/settings/src/index.ts)

<a id="ctxsettingscontroller--settingscontroller"></a>

### `ctx.settingsController` — `SettingsController`

Host service backing the generated `ctx.remote.settings` namespace. Every remote read uses `redactSecrets: true`, so a `role('secret')` field cannot ride a response. Writes expose the settings service's merge, replacement, and path-addressed operations, and classify every provider refusal as `settings/conflict` or `settings/rejected` with the service's message.

```ts cordis-catalog
/**
 * Describe every registered namespace for a configuration page: redacted
 * layered values plus the serialized schema the page renders its form from.
 * @returns provider writability, local-document presence, and one view per namespace.
 * @throws RemoteError when no settings provider is mounted.
 */
@Remote describe(): SettingsDescribeValue

/**
 * Merge a patch into one namespace's stored user section.
 * @param ns - namespace key to write.
 * @param patch - fields to merge into the user section.
 * @param expectedRevision - revision the caller read; `undefined` writes unconditionally.
 * @returns the namespace's redacted view after the write.
 * @throws RemoteError when the request is invalid, no provider is mounted, or the provider refuses the write.
 */
@Remote update( ns: string, patch: Record<string, JsonValue>, expectedRevision: number | undefined, ): Promise<SettingsNamespaceView>

/**
 * Replace one namespace's stored user section wholesale.
 * @param ns - namespace key to write.
 * @param section - complete replacement user section.
 * @param expectedRevision - revision the caller read; `undefined` writes unconditionally.
 * @returns the namespace's redacted view after the write.
 * @throws RemoteError when the request is invalid, no provider is mounted, or the provider refuses the write.
 */
@Remote replace( ns: string, section: Record<string, JsonValue>, expectedRevision: number | undefined, ): Promise<SettingsNamespaceView>

/**
 * Apply path-addressed edits to one namespace's user section, resolved against
 * the section as stored rather than against whatever the caller last read,
 * then answer with that namespace's new redacted view.
 * @param ns - namespace key to write.
 * @param ops - the edits to apply, in order.
 * @param expectedRevision - revision the caller read; `undefined` writes unconditionally.
 * @returns the namespace's redacted view after the write.
 * @throws RemoteError when the request is invalid, no provider is mounted, or the provider refuses the write.
 */
@Remote async mutate( ns: string, ops: SettingsPathOpView[], expectedRevision: number | undefined, ): Promise<SettingsNamespaceView>

/**
 * Materialize the provider-owned settings document and open it in a native text editor.
 * @param signal - caller lifetime; abort terminates preparation or the native command.
 * @returns confirmation after the native opener accepts the document.
 * @throws RemoteError when no document exists, preparation fails, or opening fails.
 */
@Remote async openSettingsDocument(signal: AbortSignal): Promise<SettingsDocumentOpenValue>
```

Source: [`packages/api/settings-controller/src/index.ts`](../../packages/api/settings-controller/src/index.ts)

<a id="settings-events"></a>

### `settings/*` events

<a id="settingsdocument-updated--emit"></a>

#### `settings/document-updated` — emit

One profile entry's form values, availability, or page policy changed. Form clients re-read its schema, resolved values, and revision.

```ts cordis-catalog
/**
 * One profile entry's form values, availability, or page policy changed.
 * Form clients re-read its schema, resolved values, and revision.
 * @param ns Profile entry id.
 * @param revision The entry's new revision.
 * @mode emit
 */
'settings/document-updated'(ns: SettingsNamespace, revision: number): void
```

Source: [`packages/settings/settings/src/types.ts`](../../packages/settings/settings/src/types.ts)
<!-- END GENERATED cordis-surface -->
