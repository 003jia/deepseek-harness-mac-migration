/** Memory preferences and local fact editor, driven by injected Host operations. @module */
import { useEffect, useState } from 'react'
import type { MemoryId, MemorySnapshot, SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsRuntime, PropsLocale, InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import css from './MemorySettings.module.css'

/** Host operations and their shared refreshable snapshot. */
export interface MemorySettingsInjected {
  hooks: { memory: SnapshotStore<MemorySnapshot | null> }
  load: () => Promise<void>
  preferences: (enabled: boolean, automatic: boolean) => Promise<void>
  save: (id: MemoryId | null, workspace: string, content: string) => Promise<void>
  remove: (id: MemoryId) => Promise<void>
  extract: (sessionId: SessionId) => Promise<void>
}

/** Composed memory settings props. */
export type MemorySettingsProps = PropsRuntime<'settings.section'> & PropsLocale<'settings.memory'> & InjectFace<MemorySettingsInjected>

/** Render the dependent preferences, saved facts, and manual extraction. */
export function MemorySettings({ useMemory, useSessions, load, preferences, save, remove, extract, t }: MemorySettingsProps) {
  const memory = useMemory(value => value)
  const sessionId = useSessions(state => state.current)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<MemoryId | null>(null)
  const [content, setContent] = useState('')
  const [workspace, setWorkspace] = useState('')
  useEffect(() => { void load().catch(() => { setError(t('error')) }) }, [load, t])
  const run = (operation: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    setError(null)
    void operation().catch((failure: unknown) => {
      setError(failure instanceof Error ? failure.message : t('error'))
    }).finally(() => { setBusy(false) })
  }
  const reset = () => { setEditing(null); setContent(''); setWorkspace('') }
  return <section className={css.section} aria-label={t('title')} aria-busy={busy}>
    <div className={css.row}>
      <label htmlFor="memory-enabled"><strong>{t('enabled')}</strong><p>{t('enabledDescription')}</p></label>
      <input id="memory-enabled" type="checkbox" role="switch" checked={memory?.enabled ?? false} disabled={busy || memory === null}
        onChange={(event) => {
          const checked = event.currentTarget.checked
          run(() => preferences(checked, memory?.autoExtract ?? true))
        }} />
    </div>
    <div className={`${css.row} ${css.child}`}>
      <label htmlFor="memory-auto"><strong>{t('autoExtract')}</strong><p>{t('autoDescription')}</p><p>{t('dependency')}</p></label>
      <input id="memory-auto" type="checkbox" role="switch" checked={memory?.autoExtract ?? true} disabled={busy || !memory?.enabled}
        onChange={(event) => { const checked = event.currentTarget.checked; run(() => preferences(true, checked)) }} />
    </div>
    <p className={css.muted}>{t('storage')}</p>
    <div className={css.actions}>
      <button disabled={busy} onClick={() => { run(load) }}>{t('refresh')}</button>
      <button disabled={busy || !memory?.enabled || sessionId === undefined} onClick={() => { if (sessionId !== undefined) run(() => extract(sessionId)) }}>{t('extract')}</button>
      {memory?.extracting && <span role="status">{t('extracting')}</span>}
    </div>
    {(error ?? memory?.error) && <p role="alert">{error ?? memory?.error}</p>}
    <form className={css.form} onSubmit={(event) => {
      event.preventDefault()
      run(async () => { await save(editing, workspace.trim(), content.trim()); reset() })
    }}>
      <label>{t('content')}<textarea value={content} onChange={(event) => { setContent(event.currentTarget.value) }} required disabled={busy} /></label>
      <label>{t('workspace')}<input value={workspace} onChange={(event) => { setWorkspace(event.currentTarget.value) }} disabled={busy} /></label>
      <div className={css.actions}>
        <button disabled={busy || memory === null || content.trim().length === 0} type="submit">{busy ? t('busy') : t('save')}</button>
        {editing !== null && <button type="button" onClick={reset}>{t('cancel')}</button>}
      </div>
    </form>
    {memory?.entries.length === 0 && <p className={css.muted}>{t('empty')}</p>}
    <ul className={css.entries}>{memory?.entries.map(item => <li key={item.id}>
      <p>{item.content}</p><small>{item.workspace || t('shared')} · {t(item.source === 'automatic' ? 'automatic' : 'manual')}</small>
      <div className={css.actions}>
        <button disabled={busy} onClick={() => { setEditing(item.id); setContent(item.content); setWorkspace(item.workspace) }}>{t('edit')}</button>
        <button disabled={busy} onClick={() => { run(() => remove(item.id)) }}>{t('remove')}</button>
      </div>
    </li>)}</ul>
  </section>
}
