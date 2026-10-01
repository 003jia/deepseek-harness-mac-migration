import { useState, type ReactNode } from 'react'
import type { ExtensionsSearchResponse, PackageOperationResult } from '@deepseek-ai/dsh-api-remotes/client'
import { IconSearchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './locales.ts'
import css from './ExtensionsSettingsTab.module.css'

/** Registration-side Remote face used by the section. */
export interface ExtensionsSettingsTabInjected {
  /** Search the extensions registry. */
  search: (query: string) => Promise<ExtensionsSearchResponse>
  /** Install a registry package into the active profile. */
  install: (spec: string) => Promise<PackageOperationResult>
  /** Update an installed package to its registry latest. */
  update: (packageName: string) => Promise<PackageOperationResult>
  /** Remove an installed package from the active profile. */
  remove: (packageName: string) => Promise<PackageOperationResult>
}

/** Full component props assembled by the Settings slot renderer. */
export type ExtensionsSettingsTabProps =
  PropsRuntime<'settings.plugins.tab'>
  & PropsLocale<'settings.extensions'>
  & InjectFace<ExtensionsSettingsTabInjected>

type ViewState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly response: ExtensionsSearchResponse }

type OperationState =
  | { readonly status: 'idle' }
  | { readonly status: 'running' }
  | { readonly status: 'restart-required' }
  | { readonly status: 'failed'; readonly message: string }

const INITIAL_OPERATION: OperationState = { status: 'idle' }

/** Render the extensions marketplace settings tab. */
export function ExtensionsSettingsTab({ search, install, update, remove, t }: ExtensionsSettingsTabProps): ReactNode {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<ViewState>({ status: 'idle' })
  const [operations, setOperations] = useState<Record<string, OperationState>>({})

  const doSearch = (q: string): void => {
    const trimmed = q.trim()
    if (trimmed.length === 0) return
    setState({ status: 'loading' })
    void Promise.resolve().then(() => search(trimmed)).then(
      (response) => { setState({ status: 'ready', response }) },
      () => { setState({ status: 'error' }) },
    )
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    doSearch(query)
  }

  const retry = (): void => {
    doSearch(query)
  }

  const runOperation = (name: string, action: () => Promise<PackageOperationResult>): void => {
    setOperations(current => ({ ...current, [name]: { status: 'running' } }))
    void Promise.resolve().then(action).then(
      (result) => {
        setOperations(current => ({
          ...current,
          [name]: result.ok
            ? result.restartRequired
              ? { status: 'restart-required' }
              : { status: 'idle' }
            : { status: 'failed', message: result.error ?? 'operation failed' },
        }))
      },
      () => {
        setOperations(current => ({ ...current, [name]: { status: 'failed', message: 'request failed' } }))
      },
    )
  }

  const results = state.status === 'ready' ? state.response.results : []

  return (
    <div className={css.section} aria-busy={state.status === 'loading'}>
      <div className={css.source}>
        <a href="https://github.com/topics/dsh-plugin" target="_blank" rel="noreferrer">{t('officialSource')}</a>
        <p>{t('sourceDescription')}</p>
      </div>
      <form className={css.search} onSubmit={handleSubmit}>
        <label className={css.searchLabel} htmlFor="dsh-extensions-search">
          <IconSearchOutline16 aria-hidden="true" />
          <span className={css.visuallyHidden}>{t('search')}</span>
        </label>
        <input
          id="dsh-extensions-search"
          className={css.searchInput}
          type="search"
          value={query}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchPlaceholder')}
          onChange={(event) => { setQuery(event.currentTarget.value) }}
        />
        <button type="submit" className={css.searchButton}>
          {t('search')}
        </button>
      </form>

      {state.status === 'loading' ? <p className={css.status}>{t('loading')}</p> : null}
      {state.status === 'error' ? (
        <div className={css.failure}>
          <p role="alert">{t('error')}</p>
          <button type="button" onClick={retry}>{t('retry')}</button>
        </div>
      ) : null}

      {state.status === 'idle' ? (
        <p className={css.status}>{t('empty')}</p>
      ) : null}

      {state.status === 'ready' && results.length === 0 ? (
        <p className={css.status}>{t('emptySearch')}</p>
      ) : null}

      {results.length > 0 ? (
        <ul className={css.cards}>
          {results.map((ext: ExtensionsSearchResponse['results'][number]) => {
            const operation = operations[ext.name] ?? INITIAL_OPERATION
            return (
              <li className={css.card} key={ext.name}>
                <div className={css.cardHeader}>
                  <strong className={css.cardTitle}>{ext.name}</strong>
                  <span className={css.cardVersion}>
                    {ext.installedVersion !== undefined && ext.installedVersion !== ext.version
                      ? `${ext.installedVersion} → ${ext.version}`
                      : ext.version}
                  </span>
                </div>
                <p className={css.cardDescription}>
                  {ext.description || t('noDescription')}
                </p>
                <div className={css.cardActions}>
                  {operation.status === 'restart-required' ? (
                    <span className={css.restartBadge}>{t('restartRequired')}</span>
                  ) : operation.status === 'running' ? (
                    <span className={css.runningBadge}>{t('running')}</span>
                  ) : (
                    <>
                      {ext.installed ? (
                        <>
                          <button
                            type="button"
                            className={css.actionButton}
                            disabled={ext.installedVersion === ext.version}
                            onClick={() => { runOperation(ext.name, () => update(ext.name)) }}
                          >
                            {t('update')}
                          </button>
                          <button
                            type="button"
                            className={css.actionButton}
                            onClick={() => { runOperation(ext.name, () => remove(ext.name)) }}
                          >
                            {t('remove')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={css.actionButton}
                          onClick={() => { runOperation(ext.name, () => install(ext.name)) }}
                        >
                          {t('install')}
                        </button>
                      )}
                    </>
                  )}
                </div>
                {operation.status === 'failed' ? (
                  <p className={css.operationError} role="alert">{operation.message}</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
