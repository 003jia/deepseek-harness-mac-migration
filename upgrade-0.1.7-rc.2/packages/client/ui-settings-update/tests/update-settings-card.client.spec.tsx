// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import { UpdateSettingsCard, type UpdateSettingsCardProps } from '../src/client/UpdateSettingsCard.tsx'
import { zh } from '../src/client/locales.ts'
import type {} from '../src/client/index.ts'

afterEach(cleanup)
const t: UpdateSettingsCardProps['t'] = makeTranslate(zh, commonZh)
const latest = {
  currentVersion: '0.1.6-alpha.2',
  latestVersion: '0.1.7-alpha.2',
  updateAvailable: true,
  releaseUrl: 'https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.7-alpha.2',
  publishedAt: '2026-09-22T06:16:27Z',
  desktopInstaller: null,
}

function setup(check: UpdateSettingsCardProps['check'] = vi.fn(async () => latest),
  stageSource: UpdateSettingsCardProps['stageSource'] = vi.fn(async () => ({
    status: 'prepared' as const,
    path: 'C:/dsh-upgrades/upgrade-0.1.7-alpha.2',
    version: '0.1.7-alpha.2',
  }))) {
  const props: UpdateSettingsCardProps = { check, stageSource, t }
  render(<UpdateSettingsCard {...props} />)
  return { check, stageSource }
}

describe('UpdateSettingsCard', () => {
  it('checks on entry and stages a new source checkout from the button', async () => {
    const { stageSource } = setup()
    expect(await screen.findByText('发现新版本')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '更新 DeepSeek Harness 源码' }))
    await waitFor(() => { expect(stageSource).toHaveBeenCalledOnce() })
    expect(await screen.findByText(/新版源码已准备好/)).toBeTruthy()
    expect(screen.getByText(/C:\/dsh-upgrades/)).toBeTruthy()
  })

  it('reports conflicts without claiming the staged checkout is ready', async () => {
    setup(undefined, vi.fn(async () => ({
      status: 'conflicts' as const,
      path: 'C:/dsh-upgrades/conflicted',
      version: '0.1.7-alpha.2',
    })))
    fireEvent.click(await screen.findByRole('button', { name: '更新 DeepSeek Harness 源码' }))
    expect(await screen.findByText(/定制提交存在冲突/)).toBeTruthy()
  })

  it('hides the source action when the installed release is current', async () => {
    setup(vi.fn(async () => ({ ...latest, updateAvailable: false })))
    expect(await screen.findByText('已是最新版本')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '更新 DeepSeek Harness 源码' })).toBeNull()
  })
})
