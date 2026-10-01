/** Host-managed skill, MCP and subagent editor. @module */
import { useEffect, useState, type FormEvent } from 'react'
import type { CapabilityConfig, CapabilityId, CapabilityKind, CapabilitySnapshot } from '@deepseek-ai/dsh-api-remotes/client'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './CapabilitySettings.module.css'

/** Host operations and the shared settings snapshot. */
export interface CapabilitySettingsInjected {
  kind: CapabilityKind
  hooks: { capabilities: SnapshotStore<CapabilitySnapshot | null> }
  load: () => Promise<void>
  save: (id: CapabilityId | null, kind: CapabilityKind, name: string, config: CapabilityConfig, enabled: boolean) => Promise<void>
  toggle: (id: CapabilityId, enabled: boolean) => Promise<void>
  remove: (id: CapabilityId) => Promise<void>
  reconnect: (id: CapabilityId) => Promise<void>
}

/** Composed Settings page props. */
export type CapabilitySettingsProps = PropsRuntime<'settings.section'>
  & PropsLocale<'settings.capabilities'>
  & InjectFace<CapabilitySettingsInjected>

const EXAMPLES: Record<CapabilityKind, string> = {
  skill: '{\n  \"directory\": \"/absolute/path/to/skills\"\n}',
  mcp: '{\n  \"transport\": \"stdio\",\n  \"command\": \"npx\",\n  \"args\": [\"-y\", \"@modelcontextprotocol/server-filesystem\", \"/workspace\"],\n  \"cwd\": \"/workspace\",\n  \"toolCallTimeoutMs\": 60000\n}',
  subagent: '{\n  \"provider\": \"spawn\",\n  \"agentOptions\": { \"provider\": \"deepseek-official\", \"model\": \"deepseek-v4-flash\", \"maxTokens\": 4096 },\n  \"toolFilter\": { \"allow\": [\"read_file\"], \"deny\": [] },\n  \"maxDepth\": 1\n}',
}

/** Render configuration and lifecycle controls for one capability kind. */
export function CapabilitySettings({
  kind, useCapabilities, load, save, toggle, remove, reconnect, t,
}: CapabilitySettingsProps) {
  const snapshot = useCapabilities(value => value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<CapabilityId | null>(null)
  const [editingEnabled, setEditingEnabled] = useState(true)
  const [name, setName] = useState('')
  const [config, setConfig] = useState(EXAMPLES[kind])

  useEffect(() => { void load().catch(() => { setError(t('error')) }) }, [load, t])

  const run = (action: () => Promise<void>): void => {
    if (busy) return
    setBusy(true)
    setError(null)
    void Promise.resolve().then(action).catch((failure: unknown) => {
      setError(failure instanceof Error ? failure.message : t('error'))
    }).finally(() => { setBusy(false) })
  }

  const reset = (): void => {
    setEditing(null)
    setEditingEnabled(true)
    setName('')
    setConfig(EXAMPLES[kind])
  }

  const submit = (event: FormEvent): void => {
    event.preventDefault()
    run(async () => {
      let parsed: unknown
      try {
        parsed = JSON.parse(config)
      } catch {
        throw new Error(t('invalidJson'))
      }
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error(t('objectRequired'))
      await save(editing, kind, name.trim(), parsed as CapabilityConfig, editingEnabled)
      reset()
    })
  }

  const entries = snapshot?.entries.filter(entry => entry.kind === kind) ?? []
  const helpKey = kind === 'skill' ? 'skillHelp' : kind === 'mcp' ? 'mcpHelp' : 'subagentHelp'
  const headingKey = kind === 'skill' ? 'skills' : kind === 'mcp' ? 'mcp' : 'subagents'

  return <section className={css.section} aria-busy={busy}>
    <h2 className={css.heading}>{t(headingKey)}</h2>
    <p className={css.description}>{t(helpKey)}</p>
    <p className={css.hint}>{t('restart')}</p>
    <form className={css.form} onSubmit={submit}>
      <label>{t('name')}<input value={name} onChange={(event) => { setName(event.currentTarget.value) }} required disabled={busy} /></label>
      <label>{t('config')}<textarea value={config} onChange={(event) => { setConfig(event.currentTarget.value) }} required spellCheck={false} disabled={busy} /></label>
      <p className={css.hint}>{t('configHint')}</p>
      <details><summary>{t('example')}</summary><pre className={css.configPreview}>{EXAMPLES[kind]}</pre></details>
      <div className={css.actions}>
        <button type="submit" disabled={busy || name.trim().length === 0}>{busy ? t('saving') : t('save')}</button>
        {editing !== null && <button type="button" disabled={busy} onClick={reset}>{t('cancel')}</button>}
      </div>
    </form>
    {error !== null && <p className={css.error} role="alert">{error}</p>}
    {snapshot === null && <p className={css.hint} role="status">{t('loading')}</p>}
    {entries.length === 0 && snapshot !== null && <p className={css.empty}>{t('empty')}</p>}
    <ul className={css.entries}>
      {entries.map(entry => <li className={css.entry} key={entry.id}>
        <div className={css.entryHeader}>
          <strong>{entry.name}</strong>
          <span className={css.status}>{t(entry.status)}{entry.error === null ? '' : ' — ' + entry.error}</span>
        </div>
        <pre className={css.configPreview}>{JSON.stringify(entry.config, null, 2)}</pre>
        <div className={css.rowActions}>
          <button type="button" disabled={busy} aria-pressed={entry.enabled} onClick={() => { run(() => toggle(entry.id, !entry.enabled)) }}>
            {t(entry.enabled ? 'disable' : 'enable')}
          </button>
          <button type="button" disabled={busy} onClick={() => {
            setEditing(entry.id)
            setEditingEnabled(entry.enabled)
            setName(entry.name)
            setConfig(JSON.stringify(entry.config, null, 2))
          }}>{t('edit')}</button>
          {entry.kind !== 'skill' && <button type="button" disabled={busy || !entry.enabled} onClick={() => { run(() => reconnect(entry.id)) }}>{t('retry')}</button>}
          <button type="button" disabled={busy} onClick={() => { run(() => remove(entry.id)) }}>{t('remove')}</button>
        </div>
      </li>)}
    </ul>
  </section>
}
