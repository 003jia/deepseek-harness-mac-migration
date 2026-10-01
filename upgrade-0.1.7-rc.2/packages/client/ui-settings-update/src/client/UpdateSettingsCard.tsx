/** Official release check and side-by-side source upgrade entry. */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { IconCheckOutlineRegular, IconDownloadOutlineRegular, IconRefreshOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SourceUpgradeResult, UpdateCheckResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import css from './UpdateSettingsCard.module.css'

/** Host actions supplied by the plugin registration. */
export interface UpdateSettingsCardInjected {
  check: () => Promise<UpdateCheckResult>
  stageSource: () => Promise<SourceUpgradeResult>
}

/** Settings slot props. */
export type UpdateSettingsCardProps = PropsLocale<'settings.update'> & InjectFace<UpdateSettingsCardInjected>

type ViewState =
  | { readonly status: 'checking' }
  | { readonly status: 'failed' }
  | { readonly status: 'ready'; readonly result: UpdateCheckResult }
type UpgradeState =
  | { readonly status: 'idle' | 'staging' }
  | { readonly status: 'done'; readonly result: SourceUpgradeResult }
  | { readonly status: 'failed'; readonly message: string }

/** Render official release metadata and stage a source upgrade in a separate checkout. */
export function UpdateSettingsCard({ check, stageSource, t }: UpdateSettingsCardProps): ReactNode {
  const [state, setState] = useState<ViewState>({ status: 'checking' })
  const [upgrade, setUpgrade] = useState<UpgradeState>({ status: 'idle' })
  const runCheck = useCallback((): void => {
    setState({ status: 'checking' })
    void check().then(
      (result) => { setState({ status: 'ready', result }) },
      () => { setState({ status: 'failed' }) },
    )
  }, [check])
  useEffect(() => { runCheck() }, [runCheck])
  const startUpgrade = (): void => {
    setUpgrade({ status: 'staging' })
    void stageSource().then(
      (result) => { setUpgrade({ status: 'done', result }) },
      (error: unknown) => { setUpgrade({ status: 'failed', message: String(error) }) },
    )
  }
  return <section className={css.card} aria-label={t('title')}>
    <div className={css.header}>
      <div>
        <h3 className={css.title}>{t('title')}</h3>
        <p className={css.subtitle}>{t('officialSource')}</p>
      </div>
      <button type="button" className={css.refreshButton}
        disabled={state.status === 'checking' || upgrade.status === 'staging'} onClick={runCheck}>
        <IconRefreshOutlineRegular size={16} />
        {state.status === 'checking' ? t('checking') : t('checkAgain')}
      </button>
    </div>
    {state.status === 'checking' && <div className={css.loading} role="status">
      <IconRefreshOutlineRegular className={css.loadingIcon} size={18} />
      <div className={css.loadingContent}>
        <p className={css.loadingTitle}>{t('checkingTitle')}</p>
        <p className={css.loadingDetail}>{t('checkingDetail')}</p>
        <div className={css.progressTrack} role="progressbar" aria-label={t('checkProgress')}>
          <div className={css.progressIndicator} />
        </div>
      </div>
    </div>}
    {state.status === 'ready' && <div className={css.result}>
      <div className={css.statusCard} role="status">
        <IconCheckOutlineRegular className={css.statusIcon} size={20} />
        <div>
          <p className={css.statusTitle}>{t(state.result.updateAvailable ? 'updateAvailable' : 'upToDate')}</p>
          <p className={css.statusDetail}>{t(state.result.updateAvailable ? 'updateDetail' : 'upToDateDetail')}</p>
        </div>
      </div>
      <dl className={css.metadata}>
        <div className={css.metadataRow}><dt>{t('current')}</dt><dd>{state.result.currentVersion ?? '—'}</dd></div>
        <div className={css.metadataRow}><dt>{t('latest')}</dt><dd>{state.result.latestVersion}</dd></div>
        <div className={css.metadataRow}><dt>{t('publishedAt')}</dt><dd>{state.result.publishedAt ?? '—'}</dd></div>
      </dl>
      <div className={css.actions}>
        {state.result.updateAvailable && <button type="button" className={css.primaryLink}
          disabled={upgrade.status === 'staging'} onClick={startUpgrade}>
          <IconDownloadOutlineRegular size={16} />
          {t(upgrade.status === 'staging' ? 'stagingSource' : 'updateSource')}
        </button>}
        <a className={css.secondaryLink} href={state.result.releaseUrl} target="_blank" rel="noreferrer">
          {t('viewOfficialRelease')}
        </a>
      </div>
      {upgrade.status === 'done' && <p className={css.downloadMessage} role="status">
        {t(upgrade.result.status === 'conflicts' ? 'sourceConflicts'
          : upgrade.result.status === 'up-to-date' ? 'sourceUpToDate' : 'sourcePrepared')}
        {upgrade.result.path === null ? '' : ` ${upgrade.result.path}`}
      </p>}
      {upgrade.status === 'failed' && <p className={css.downloadError} role="alert">
        {t('sourceFailed')} {upgrade.message}
      </p>}
    </div>}
    {state.status === 'failed' && <div className={css.failed} role="alert">
      <p className={css.failedTitle}>{t('checkFailed')}</p>
      <p className={css.failedDetail}>{t('checkFailedDetail')}</p>
      <button type="button" className={css.retryButton} onClick={runCheck}>{t('retry')}</button>
    </div>}
  </section>
}
