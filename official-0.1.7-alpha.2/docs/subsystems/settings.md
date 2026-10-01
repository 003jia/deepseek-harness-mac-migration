# Plugin Configuration Forms

English | [中文](settings.zh.md)

The [settings service](../../packages/settings/settings/README.md) projects volatile Config fields from active profile entries. The [configuration editor](../../packages/boot/config-editor/README.md) persists edits through Cordis patches. Business consumers read `.get()` on their own Config references.

## Identity and values

A form namespace is the local id of a uniquely addressed entry in the active profile. Multiple plugin instances have separate forms when their entry ids differ. Ordinary fields are excluded. Descriptors carry resolved values, inherited values, explicit profile overrides, and an optimistic revision.

## Edits

`update` merges submitted fields. `replace` resets live fields to inherited configuration before applying submitted fields. `mutate` addresses individual paths, preserving secrets absent from a client response. Every write validates the complete Config and refuses stale revisions before persistence.

`settings/document-updated` invalidates form descriptors after Loader configuration changes. It is a UI notification; consumers use `loader/volatile-update` only when they need to refresh registration facts.

## Managed capabilities and memory

The [capability manager](../../packages/host/capability-manager/README.md) persists skill, MCP, and subagent entries. `CapabilityId` identifies a saved entry; `CapabilityKind` selects its family; `CapabilityConfig` holds provider-specific JSON values. `CapabilitySnapshot` returns entries with saved enablement and separate runtime status.

The [memory service](../../packages/host/memory/README.md) stores project-scoped and explicitly shared facts. `MemoryId` identifies a fact by scope and normalized content. `MemorySnapshot` returns preferences, facts, and extraction status. Memory data is stored by the local storage domain rather than the volatile settings form.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

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

Types: [SessionId](core.md)

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
