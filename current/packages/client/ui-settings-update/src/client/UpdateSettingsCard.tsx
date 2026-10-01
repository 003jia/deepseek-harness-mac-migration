import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  IconCheckOutline16, IconDownloadOutline16, IconRefreshOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { UpdateCheckResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './locales.ts'
import css from './UpdateSettingsCard.module.css'

/** Registration-side Remote face used by the section. */
export interface UpdateSettingsCardInjected {
  /** Compare the running version against the latest official GitHub release. */
  check: () => Promise<UpdateCheckResult>
  /** Native desktop installer transfer, absent in ordinary Web clients. */
  desktopUpdater?: DesktopUpdater
}

/** Local desktop transfer state; bytes come from the Electron main process. */
export type DownloadState =
  | { readonly status: 'idle' }
  | { readonly status: 'downloading'; readonly assetName: string; readonly receivedBytes: number; readonly totalBytes: number | null }
  | { readonly status: 'downloaded'; readonly assetName: string; readonly path: string }
  | { readonly status: 'failed'; readonly assetName: string; readonly message: string }

/** Narrow renderer API supplied by the desktop preload. */
export interface DesktopUpdater {
  start: (installer: NonNullable<UpdateCheckResult['desktopInstaller']>) => Promise<DownloadState>
  status: () => Promise<DownloadState>
  cancel: () => Promise<void>
  open: () => Promise<void>
}

/** Full component props assembled by the Settings slot renderer. */
export type UpdateSettingsCardProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.update'>
  & InjectFace<UpdateSettingsCardInjected>

type ViewState =
  | { readonly status: 'checking' }
  | { readonly status: 'failed' }
  | { readonly status: 'ready'; readonly result: UpdateCheckResult }

/** Render the official-release status in Settings, never a third-party updater. */
export function UpdateSettingsCard({ check, desktopUpdater, t }: UpdateSettingsCardProps): ReactNode {
  const [state, setState] = useState<ViewState>({ status: 'checking' })
  const [download, setDownload] = useState<DownloadState>({ status: 'idle' })
  const [openError, setOpenError] = useState(false)
  const launchOnDownload = useRef(false)
  const startPending = useRef(false)

  const runCheck = useCallback((): void => {
    setState({ status: 'checking' })
    void Promise.resolve().then(check).then(
      (result) => { setState({ status: 'ready', result }) },
      () => { setState({ status: 'failed' }) },
    )
  }, [check])

  useEffect(() => { runCheck() }, [runCheck])

  useEffect(() => {
    if (desktopUpdater === undefined) return
    let active = true
    void desktopUpdater.status().then(
      (status) => { if (active && !startPending.current) setDownload(status) },
      () => { if (active && !startPending.current) setDownload({ status: 'idle' }) },
    )
    return () => { active = false }
  }, [desktopUpdater])

  useEffect(() => {
    if (desktopUpdater === undefined || download.status !== 'downloading') return
    let active = true
    const timer = setInterval(() => {
      void desktopUpdater.status().then(
        (status) => { if (active && (status.status !== 'idle' || !startPending.current)) setDownload(status) },
        () => { if (active && !startPending.current) setDownload({ status: 'idle' }) },
      )
    }, 300)
    return () => { active = false; clearInterval(timer) }
  }, [desktopUpdater, download.status])

  useEffect(() => {
    if (!launchOnDownload.current || desktopUpdater === undefined || state.status !== 'ready') return
    if (download.status === 'failed' || (download.status === 'idle' && !startPending.current)) {
      launchOnDownload.current = false
    } else if (download.status === 'downloaded' && download.assetName === state.result.desktopInstaller?.name) {
      launchOnDownload.current = false
      void desktopUpdater.open().catch(() => { setOpenError(true) })
    }
  }, [desktopUpdater, download, state])

  const startDownload = (installer: NonNullable<UpdateCheckResult['desktopInstaller']>): void => {
    if (desktopUpdater === undefined) return
    setOpenError(false)
    launchOnDownload.current = true
    startPending.current = true
    setDownload({ status: 'downloading', assetName: installer.name, receivedBytes: 0, totalBytes: null })
    void desktopUpdater.start(installer).then(
      (status) => { startPending.current = false; setDownload(status) },
      (error: unknown) => {
        startPending.current = false
        launchOnDownload.current = false
        setDownload({ status: 'failed', assetName: installer.name, message: String(error) })
      },
    )
  }

  const downloadPercent = download.status === 'downloading' && download.totalBytes !== null
    ? Math.min(100, Math.floor(download.receivedBytes / download.totalBytes * 100))
    : null

  return (
    <section className={css.card} aria-label={t('title')}>
      <div className={css.header}>
        <div>
          <h3 className={css.title}>{t('title')}</h3>
          <p className={css.subtitle}>{t('officialSource')}</p>
        </div>
        <button
          type="button"
          className={css.refreshButton}
          disabled={state.status === 'checking' || download.status === 'downloading'}
          onClick={runCheck}
        >
          <IconRefreshOutline16 size={16} />
          {state.status === 'checking' ? t('checking') : t('checkAgain')}
        </button>
      </div>

      {state.status === 'checking' ? (
        <div className={css.loading} role="status">
          <IconRefreshOutline16 className={css.loadingIcon} size={18} />
          <div className={css.loadingContent}>
            <p className={css.loadingTitle}>{t('checkingTitle')}</p>
            <p className={css.loadingDetail}>{t('checkingDetail')}</p>
            <div className={css.progressTrack} role="progressbar" aria-label={t('checkProgress')}>
              <div className={css.progressIndicator} />
            </div>
          </div>
        </div>
      ) : null}

      {state.status === 'ready' ? (
        <div className={css.result} data-update-available={state.result.updateAvailable ? 'true' : 'false'}>
          <div className={css.statusCard} role="status">
            <IconCheckOutline16 className={css.statusIcon} size={20} />
            <div>
              <p className={css.statusTitle}>{state.result.updateAvailable ? t('updateAvailable') : t('upToDate')}</p>
              <p className={css.statusDetail}>
                {state.result.updateAvailable
                  ? t(state.result.desktopInstaller === null ? 'updateDetail' : 'installerDetail')
                  : t('upToDateDetail')}
              </p>
            </div>
          </div>
          <dl className={css.metadata}>
            <div className={css.metadataRow}>
              <dt>{t('current')}</dt>
              <dd>{state.result.currentVersion ?? '—'}</dd>
            </div>
            <div className={css.metadataRow}>
              <dt>{t('latest')}</dt>
              <dd>{state.result.latestVersion}</dd>
            </div>
            <div className={css.metadataRow}>
              <dt>{t('publishedAt')}</dt>
              <dd>{state.result.publishedAt ?? '—'}</dd>
            </div>
          </dl>
          <div className={css.actions}>
            {state.result.updateAvailable && state.result.desktopInstaller !== null && desktopUpdater === undefined ? (
              <a className={css.primaryLink} href={state.result.desktopInstaller.url} target="_blank" rel="noreferrer">
                <IconDownloadOutline16 size={16} />{t('downloadInstaller')}
              </a>
            ) : null}
            {state.result.updateAvailable && state.result.desktopInstaller !== null && desktopUpdater !== undefined
              && (download.status === 'idle' || download.assetName !== state.result.desktopInstaller.name || download.status === 'failed') ? (
                <button type="button" className={css.primaryLink} onClick={() => {
                  const installer = state.result.desktopInstaller
                  if (installer !== null) startDownload(installer)
                }}>
                  <IconDownloadOutline16 size={16} />{t('updateNow')}
                </button>
              ) : null}
            {state.result.updateAvailable && desktopUpdater !== undefined && download.status === 'downloaded'
              && download.assetName === state.result.desktopInstaller?.name ? (
                <button type="button" className={css.primaryLink} onClick={() => {
                  void desktopUpdater.open().catch(() => { setOpenError(true) })
                }}>{t('openInstaller')}</button>
              ) : null}
            <a className={css.secondaryLink} href={state.result.releaseUrl} target="_blank" rel="noreferrer">
              {t('viewOfficialRelease')}
            </a>
          </div>
          {desktopUpdater !== undefined && download.status === 'downloading'
            && download.assetName === state.result.desktopInstaller?.name ? (
              <div className={css.downloadStatus} role="status">
                <div className={css.downloadHeader}>
                  <span>{t('downloadingInstaller')}</span>
                  <span>{downloadPercent === null ? `${(download.receivedBytes / 1048576).toFixed(1)} MB` : `${downloadPercent}%`}</span>
                </div>
                <div
                  className={css.progressTrack}
                  role="progressbar"
                  aria-label={t('downloadProgress')}
                  aria-valuenow={downloadPercent ?? undefined}
                  aria-valuemin={downloadPercent === null ? undefined : 0}
                  aria-valuemax={downloadPercent === null ? undefined : 100}
                >
                  <div className={downloadPercent === null ? css.progressIndicator : css.downloadIndicator}
                    style={downloadPercent === null ? undefined : { width: `${downloadPercent}%` }} />
                </div>
                <button type="button" className={css.cancelButton} onClick={() => {
                  launchOnDownload.current = false
                  void desktopUpdater.cancel()
                }}>
                  {t('cancelDownload')}
                </button>
              </div>
            ) : null}
          {download.status === 'downloaded' && download.assetName === state.result.desktopInstaller?.name ? (
            <p className={css.downloadMessage} role="status">{t('downloadComplete')} {download.path}</p>
          ) : null}
          {download.status === 'failed' && download.assetName === state.result.desktopInstaller?.name ? (
            <p className={css.downloadError} role="alert">{t('downloadFailed')} {download.message}</p>
          ) : null}
          {openError ? <p className={css.downloadError} role="alert">{t('openInstallerFailed')}</p> : null}
          {state.result.updateAvailable && state.result.desktopInstaller === null ? (
            <p className={css.noInstaller}>{t('noInstaller')}</p>
          ) : null}
        </div>
      ) : null}

      {state.status === 'failed' ? (
        <div className={css.failed} role="alert">
          <p className={css.failedTitle}>{t('checkFailed')}</p>
          <p className={css.failedDetail}>{t('checkFailedDetail')}</p>
          <button type="button" className={css.retryButton} onClick={runCheck}>{t('retry')}</button>
        </div>
      ) : null}
    </section>
  )
}
