// Web e2e scenario: execution modes. It verifies the composer composes the
// existing Plan and permission commands while the Agent preset remains a
// separate composition choice in Settings and the session header.
//
// Zero model calls: no replay fixture mounts, so a stray stream fails loud.
import { fileURLToPath } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  SESSION_FORMAT_VERSION, SessionId as sessionId, type SessionEvent, type SessionId,
} from '@deepseek-ai/dsh-session'
import { snapshotSubagentDescriptor } from '@deepseek-ai/dsh-subagent'
import {
  captureStableAria, compareOrRefreshGolden, launchWebScaffold, seedSession, watchConsole,
  webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, saveFailureShot } from './support.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('./snapshots/agent-preset-selection', import.meta.url))
const HERO_EXPECTED = join(SNAPSHOT_DIR, 'hero.expected.md')
const MENU_EXPECTED = join(SNAPSHOT_DIR, 'menu.expected.md')
const HEADER_EXPECTED = join(SNAPSHOT_DIR, 'header.expected.md')
/** The shipped roster, beside the composition that names it. */
const SHIPPED_PRESETS = fileURLToPath(new URL('../../cli/config/agent-presets', import.meta.url))
const MODE = webSnapshotMode()
const SEED_ID = 'agent-preset-selection-web-e2e'
/** A project skill only a preset that mounts `skill-filesystem` can discover. */
const SKILL_NAME = 'preset-catalog-demo'

/**
 * Seed one project skill under the connected workspace.
 *
 * Local skill discovery is a PRESET row, so this file is visible through
 * `standard` and invisible through `minimal` — which makes the '/' menu's
 * skill group a statement about the session's composition.
 * @param workspaceCwd - the scaffold's temp project parent.
 */
async function seedWorkspaceSkill(workspaceCwd: string): Promise<void> {
  const directory = join(workspaceCwd, 'workspace', '.agents', 'skills', SKILL_NAME)
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'SKILL.md'), [
    '---',
    `name: ${SKILL_NAME}`,
    'description: Prove the slash catalog follows the session composition',
    '---',
    '',
    'Body.',
    '',
  ].join('\n'))
}

/**
 * A settled one-turn session with no model content: this lane asserts chrome
 * around a conversation, not a conversation, and a recorded turn would tie
 * the golden to a provider's wording for no gain.
 * @returns a tokenized session log ending on a closed turn.
 */
function seedLog(): string {
  const time = 1784974100000
  const at = (index: number, event: Record<string, unknown>): string =>
    JSON.stringify({ ...event, seq: index, time: time + index })
  return [
    JSON.stringify({ type: 'session', version: 0, id: '{{sessionId}}', createdAt: time, cwd: '{{cwd}}/workspace' }),
    at(0, { type: 'turn/start', data: { turn: 1, trigger: { kind: 'message', source: { kind: 'user', rpcId: 'seed' } } } }),
    at(1, {
      type: 'user/message',
      data: { content: [{ type: 'text', text: 'Seeded turn.' }], source: { kind: 'user', rpcId: 'seed' } },
      surfaceOp: 'append',
    }),
    at(2, { type: 'session/title', data: { title: 'Seeded turn', messageSeqs: [1], source: { kind: 'fallback' } } }),
    at(3, { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } }),
  ].join('\n')
}

/**
 * Persist one child so the assembled header snapshot exercises both action
 * contributors whose relative order is the product contract under test.
 * @param scaffold - the booted Web scaffold.
 * @param parentId - the seeded session whose header the browser opens.
 */
async function seedSubagent(scaffold: WebScaffold, parentId: SessionId): Promise<void> {
  const childId = sessionId('agent-preset-selection-child')
  const createdAt = 1784974100100
  await scaffold.ctx.sessionPersistence.create({
    version: SESSION_FORMAT_VERSION,
    id: childId,
    createdAt,
    cwd: scaffold.workspaceCwd,
    parentSession: parentId,
    origin: 'subagent',
    delegationDepth: 1,
    agentPreset: 'minimal',
  })
  await scaffold.ctx.sessionPersistence.append(childId, [
    {
      type: 'turn/start',
      seq: 0,
      time: createdAt,
      data: { turn: 1, trigger: { kind: 'message', source: { kind: 'user' } } },
    },
    {
      type: 'user/message',
      seq: 1,
      time: createdAt + 1,
      data: {
        content: [{ type: 'text', text: 'Check the session-header action order.' }],
        source: { kind: 'user' },
      },
      surfaceOp: 'append',
    },
    {
      type: 'subagent/descriptor',
      seq: 2,
      time: createdAt + 2,
      data: snapshotSubagentDescriptor({
        mode: 'one-shot', provider: 'spawn', label: 'header order probe',
      }),
    },
    {
      type: 'turn/end',
      seq: 3,
      time: createdAt + 3,
      data: { turn: 1, reason: { kind: 'completed' } },
    },
  ] as SessionEvent[])
  await scaffold.ctx.sessionProjectionCache.coldSnapshot(childId)
}

/**
/** Every option label the trigger menu currently lists. */
async function menuOptions(page: Page): Promise<string[]> {
  const menu = page.getByRole('listbox', { name: 'Trigger suggestions' })
  await menu.waitFor({ timeout: 10_000 })
  return await menu.getByRole('option').allTextContents()
}

describe('web e2e: agent-preset selection', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    scaffold = await launchWebScaffold({
      agentPresets: { roots: [{ path: SHIPPED_PRESETS, trust: 'system' }], default: 'standard' },
    })
    // A resumed session runs what it was created with; seeding one that
    // records `minimal` is what makes the header label a claim about the
    // session rather than an echo of the current default.
    const seededId = await seedSession(scaffold, seedLog(), SEED_ID, 'minimal')
    await seedSubagent(scaffold, seededId)
    await seedWorkspaceSkill(scaffold.workspaceCwd)
    browser = await chromium.launch()
    page = await newEnglishPage(browser)
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  it('restores the Agent preset chooser beside the workspace picker', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-agent-preset-hero'))
    await connectFreshWorkspace(page, scaffold.workspaceCwd)
    await page.getByRole('button', { name: 'Standard mode' }).waitFor({ timeout: 10_000 })

    const snapshot = await captureStableAria(page, '[class*="heroWorkspaceRow"]', scaffold.workspaceCwd)

    await compareOrRefreshGolden(HERO_EXPECTED, snapshot, MODE)
    expect(snapshot).toContain('button "Standard mode"')
  })

  it('offers Plan, Auto, and Full access in the work-mode menu', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-work-mode-menu'))
    await page.getByRole('button', { name: 'Execution mode, current: Auto' }).click()
    const menu = page.getByRole('menu')
    await menu.waitFor({ timeout: 10_000 })

    const snapshot = await captureStableAria(page, '[role="menu"]', scaffold.workspaceCwd)

    await compareOrRefreshGolden(MENU_EXPECTED, snapshot, MODE)
    expect(snapshot).toContain('Plan')
    expect(snapshot).toContain('Auto')
    expect(snapshot).toContain('Full access')
    expect(snapshot).toContain('Autonomous (local sandbox)')
    await page.keyboard.press('Escape')
  })

  it('applies Plan and returns to Auto through the logged host commands', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-work-mode-transition'))
    await page.getByRole('button', { name: 'Execution mode, current: Auto' }).click()
    await page.getByRole('menuitem', { name: /^Plan/ }).click()
    await page.getByRole('button', { name: 'Execution mode, current: Plan' }).waitFor()

    await page.getByRole('button', { name: 'Execution mode, current: Plan' }).click()
    await page.getByRole('menuitem', { name: /^Auto(?: |$)/ }).click()
    await page.getByRole('button', { name: 'Execution mode, current: Auto' }).waitFor()
  })

  it('switches to sandbox autonomy and back through the real permission command', async () => {
    await page.getByRole('button', { name: 'Execution mode, current: Auto' }).click()
    await page.getByRole('menuitem', { name: /^Autonomous/ }).click()
    await page.getByRole('button', { name: 'Execution mode, current: Autonomous (local sandbox)' }).waitFor()
    expect(await page.getByRole('dialog').count()).toBe(0)
    await page.getByRole('button', { name: 'Execution mode, current: Autonomous (local sandbox)' }).click()
    await page.getByRole('menuitem', { name: /^Auto(?: |$)/ }).click()
    await page.getByRole('button', { name: 'Execution mode, current: Auto' }).waitFor()
  })

  it('requires acknowledgement before Full access and lets the user cancel safely', async () => {
    await page.getByRole('button', { name: 'Execution mode, current: Auto' }).click()
    await page.getByRole('menuitem', { name: /^Full access/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Enable Full access?' })
    await dialog.waitFor()
    expect(await dialog.getByRole('button', { name: 'Enable Full access' }).isDisabled()).toBe(true)
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('button', { name: 'Execution mode, current: Auto' }).waitFor()
  })

  it('keeps the default Agent composition and its slash catalog independent of work mode', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-work-mode-slash-catalog'))
    const composer = page.locator('textarea:enabled').last()

    await composer.fill('/')
    await expect.poll(() => menuOptions(page), { timeout: 15_000 })
      .toEqual(expect.arrayContaining([expect.stringContaining(SKILL_NAME)]))
    const onDefault = await menuOptions(page)
    expect(onDefault.some(option => option.startsWith('compact'))).toBe(true)
    expect(onDefault.some(option => option.startsWith('plan'))).toBe(true)
    await composer.fill('')
  }, 90_000)

  it('labels a resumed session with the preset it was created under', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-agent-preset-header'))
    // The seeded session's cwd is the scaffold root rather than the connected
    // workspace, so it lists under Ungrouped; the group collapses by default.
    await page.getByRole('treeitem', { name: /^Ungrouped/ }).click()
    await page.locator('[role="treeitem"]').last().click()
    await page.getByText('Seeded turn.').waitFor({ timeout: 15_000 })

    const snapshot = await captureStableAria(page, '[class*="titleRow"]', scaffold.workspaceCwd)

    await compareOrRefreshGolden(HEADER_EXPECTED, snapshot, MODE)
    expect(snapshot).toContain('Minimal mode')
    expect(snapshot).toContain('button "1 subagent"')
    expect(snapshot.indexOf('Minimal mode')).toBeLessThan(snapshot.indexOf('button "1 subagent"'))
    expect(snapshot.indexOf('button "1 subagent"')).toBeLessThan(snapshot.indexOf('button "Session log"'))
    // Static chrome, not a control: the header can only report a composition
    // the host would refuse to change.
    expect(snapshot).not.toContain('button "Minimal mode"')
  })

  it('drove every surface without a page error or a stream warning', () => {
    expect(tripwire.pageErrors).toEqual([])
    expect(tripwire.warnings).toEqual([])
  })
})
