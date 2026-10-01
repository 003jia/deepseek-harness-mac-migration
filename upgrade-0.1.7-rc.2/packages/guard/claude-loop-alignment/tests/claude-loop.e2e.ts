import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LOADER_SMOKE_TEST_TIMEOUT_MS, runLoaderSmoke } from '@deepseek-ai/dsh-loader-smoke'
import type { SessionEvent } from '@deepseek-ai/dsh-session'

const driver = fileURLToPath(new URL('./fixtures/driver.ts', import.meta.url))
const configPath = fileURLToPath(new URL('./fixtures/claude-loop.patch.yml', import.meta.url))
const repoTsconfig = fileURLToPath(new URL('../../../../tsconfig.json', import.meta.url))
const expectedPath = fileURLToPath(new URL('./expected/claude-loop.expected.md', import.meta.url))
const snipDriver = fileURLToPath(new URL('./fixtures/snip-driver.ts', import.meta.url))
const snipConfigPath = fileURLToPath(new URL('./fixtures/snip.patch.yml', import.meta.url))
const snipExpectedPath = fileURLToPath(new URL('./expected/snip.expected.md', import.meta.url))

async function jsonlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return jsonlFiles(path)
    return entry.isFile() && entry.name.endsWith('.jsonl') ? [path] : []
  }))
  return nested.flat()
}

describe('Claude loop budget through the production headless profile', () => {
  it('logs the stop instruction and a final answer after one tool step', async () => {
    let events: SessionEvent[] = []
    const { stderr } = await runLoaderSmoke({
      label: 'Claude loop budget smoke',
      tempDirPrefix: 'claude-loop-e2e-',
      binScript: driver,
      libBinScript: driver,
      configPath,
      tsconfigPath: repoTsconfig,
      inspect: async (cwd) => {
        const files = await jsonlFiles(join(cwd, '.sessions'))
        expect(files).toHaveLength(1)
        const log = await readFile(files[0] as string, 'utf8')
        events = log.trimEnd().split('\n').slice(1).map(line => JSON.parse(line) as SessionEvent)
      },
    })
    expect(stderr).not.toContain('UNHANDLED')
    const transcript = events.flatMap((event) => {
      if (event.type === 'user/message'
        && event.data.content.some(block => block.type === 'text'
          && (block.text === 'read the fixture value' || block.text.startsWith('[turn budget]')))) {
        return [event.data.content]
      }
      if (event.type === 'assistant/message') return [event.data.message.content]
      return []
    })
      .map(blocks => blocks.filter(block => block.type === 'text').map(block => block.text).join('\n'))
      .filter(Boolean).join('\n') + '\n'
    expect(transcript).toBe(await readFile(expectedPath, 'utf8'))
  }, LOADER_SMOKE_TEST_TIMEOUT_MS)

  it('replaces old surface history after a model snip call', async () => {
    let events: SessionEvent[] = []
    const { stderr } = await runLoaderSmoke({
      label: 'Claude loop snip smoke',
      tempDirPrefix: 'claude-loop-snip-e2e-',
      binScript: snipDriver,
      libBinScript: snipDriver,
      configPath: snipConfigPath,
      tsconfigPath: repoTsconfig,
      inspect: async (cwd) => {
        const files = await jsonlFiles(join(cwd, '.sessions'))
        expect(files).toHaveLength(1)
        const log = await readFile(files[0] as string, 'utf8')
        events = log.trimEnd().split('\n').slice(1).map(line => JSON.parse(line) as SessionEvent)
      },
    })
    expect(stderr).not.toContain('UNHANDLED')
    const prune = events.find(event => event.type === 'compaction/prune')
    expect(prune?.type).toBe('compaction/prune')
    const replacement = events.find(event => event.type === 'user/message'
      && event.data.content.some(block => block.type === 'text' && block.text.startsWith('[History snipped')))
    expect(replacement?.surfaceOp).toMatchObject({ op: 'replace' })
    const result = events.find(event => event.type === 'tool/result' && event.data.message.toolCallId === 'snip-call')
    expect(result?.type).toBe('tool/result')
    if (result?.type === 'tool/result') expect(result.data.message.isError).not.toBe(true)
    const final = events.findLast((event): event is SessionEvent<'assistant/message'> => event.type === 'assistant/message')
    const transcript = [
      replacement?.type === 'user/message' ? replacement.data.content : [],
      final?.data.message.content ?? [],
    ].map(blocks => blocks.filter(block => block.type === 'text').map(block => block.text).join('\n')).join('\n') + '\n'
    expect(transcript).toBe(await readFile(snipExpectedPath, 'utf8'))
  }, LOADER_SMOKE_TEST_TIMEOUT_MS)
})
