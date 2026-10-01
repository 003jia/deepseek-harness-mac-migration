// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { OfficialUpdateFooterEntry, type OfficialUpdateFooterEntryProps } from '../src/client/OfficialUpdateFooterEntry.tsx'
import { UpdateSettingsCard, type DesktopUpdater, type DownloadState, type UpdateSettingsCardProps } from '../src/client/UpdateSettingsCard.tsx'
import { zh } from '../src/client/locales.ts'
import type {} from '../src/client/index.ts'

afterEach(cleanup)

const t: UpdateSettingsCardProps['t'] = makeTranslate(zh, commonZh)

function result(overrides: Partial<Awaited<ReturnType<UpdateSettingsCardProps['check']>>> = {}) {
  return {
    currentVersion: '0.1.6-alpha.2',
    latestVersion: '0.1.7-alpha.1',
    updateAvailable: true,
    releaseUrl: 'https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.7-alpha.1',
    publishedAt: '2026-09-22T06:16:27Z',
    desktopInstaller: null,
    ...overrides,
  }
}

function setup(check = vi.fn(async () => result()), desktopUpdater?: DesktopUpdater) {
  const props = { check, t, ...(desktopUpdater === undefined ? {} : { desktopUpdater }) } as unknown as UpdateSettingsCardProps
  return { check, ...render(<UpdateSettingsCard {...props} />) }
}

describe('UpdateSettingsCard', () => {
  it('shows an indeterminate progress bar only while the official check is pending', async () => {
    let finishCheck: ((value: ReturnType<typeof result>) => void) | undefined
    const check = vi.fn(() => new Promise<ReturnType<typeof result>>((resolve) => { finishCheck = resolve }))
    setup(check)

    const progress = await screen.findByRole('progressbar', { name: '版本检查进度' })
    expect(progress.getAttribute('aria-valuenow')).toBeNull()
    expect(screen.getByRole('button', { name: '检查中…' }).hasAttribute('disabled')).toBe(true)

    finishCheck?.(result())
    await screen.findByText('发现新版本')
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('checks automatically and links only to the official release when no installer is published', async () => {
    const { check } = setup()
    const release = await screen.findByRole('link', { name: '查看官方发布' })

    expect(check).toHaveBeenCalledOnce()
    expect(screen.getByText('更新信息仅来自 DeepSeek Harness 官方发布')).toBeTruthy()
    expect(release.getAttribute('href')).toBe('https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.7-alpha.1')
    expect(screen.getByText('该官方发布暂未提供本机桌面安装包；请在官方发布页选择适合的安装方式。')).toBeTruthy()
    expect(screen.queryByRole('link', { name: '下载桌面安装包' })).toBeNull()
  })

  it('shows a desktop download only for a selected official installer asset', async () => {
    setup(vi.fn(async () => result({
      desktopInstaller: {
        name: 'DeepSeek-Harness.dmg',
        url: 'https://github.com/deepseek-ai/deepseek-harness/releases/download/dsh-v0.1.7-alpha.1/DeepSeek-Harness.dmg',
      },
    })))

    const download = await screen.findByRole('link', { name: '下载桌面安装包' })
    expect(download.getAttribute('href')).toBe(
      'https://github.com/deepseek-ai/deepseek-harness/releases/download/dsh-v0.1.7-alpha.1/DeepSeek-Harness.dmg',
    )
    expect(screen.queryByText('该官方发布暂未提供本机桌面安装包；请在官方发布页选择适合的安装方式。')).toBeNull()
  })

  it('updates from one click by downloading and opening the official installer', async () => {
    const installer = {
      name: 'DeepSeek-Harness.dmg',
      url: 'https://github.com/deepseek-ai/deepseek-harness/releases/download/dsh-v0.1.7-alpha.1/DeepSeek-Harness.dmg',
    }
    let transfer: DownloadState = { status: 'idle' }
    const updater: DesktopUpdater = {
      start: vi.fn(async () => {
        transfer = { status: 'downloading', assetName: installer.name, receivedBytes: 0, totalBytes: 100 }
        return transfer
      }),
      status: vi.fn(async () => transfer),
      cancel: vi.fn(async () => {}),
      open: vi.fn(async () => {}),
    }
    setup(vi.fn(async () => result({ desktopInstaller: installer })), updater)

    fireEvent.click(await screen.findByRole('button', { name: '更新 DeepSeek Harness' }))
    const progress = await screen.findByRole('progressbar', { name: '安装包下载进度' })
    expect(progress.getAttribute('aria-valuenow')).toBe('0')
    transfer = { status: 'downloading', assetName: installer.name, receivedBytes: 50, totalBytes: 100 }
    await waitFor(() => { expect(progress.getAttribute('aria-valuenow')).toBe('50') })
    transfer = { status: 'downloaded', assetName: installer.name, path: '/tmp/DeepSeek-Harness.dmg' }
    await waitFor(() => { expect(updater.open).toHaveBeenCalledOnce() })
    expect(screen.getByText(/下载完成，安装包位置：/)).toBeTruthy()
  })

  it('does not offer an installer action when the installed version is current', async () => {
    const installer = {
      name: 'DeepSeek-Harness.dmg',
      url: 'https://github.com/deepseek-ai/deepseek-harness/releases/download/dsh-v0.1.7-alpha.1/DeepSeek-Harness.dmg',
    }
    setup(vi.fn(async () => result({ updateAvailable: false, desktopInstaller: installer })))

    await screen.findByText('已是最新版本')
    expect(screen.queryByRole('link', { name: '下载桌面安装包' })).toBeNull()
    expect(screen.queryByRole('button', { name: '更新 DeepSeek Harness' })).toBeNull()
  })

  it('renders a recoverable error and retries the official check', async () => {
    const check = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(result({ updateAvailable: false }))
    setup(check)

    const retry = await screen.findByRole('button', { name: '重试' })
    fireEvent.click(retry)
    await waitFor(() => { expect(screen.getByText('已是最新版本')).toBeTruthy() })
    expect(check).toHaveBeenCalledTimes(2)
  })
})

describe('OfficialUpdateFooterEntry', () => {
  it('opens the official update section and keeps a compact rail action', () => {
    const openUpdateSettings = vi.fn()
    const props = { wide: false, openUpdateSettings, t } as unknown as OfficialUpdateFooterEntryProps
    render(<OfficialUpdateFooterEntry {...props} />)

    const action = screen.getByRole('button', { name: '检查官方更新' })
    expect(action.textContent).toBe('')
    fireEvent.click(action)
    expect(openUpdateSettings).toHaveBeenCalledOnce()
  })
})
