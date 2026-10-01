import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LOADER_SMOKE_TEST_TIMEOUT_MS, runLoaderSmoke } from '@deepseek-ai/dsh-loader-smoke'
import type { SessionEvent } from '@deepseek-ai/dsh-session'

const driver = fileURLToPath(new URL('./fixtures/driver.ts', import.meta.url))
const configPath = fileURLToPath(new URL('./fixtures/error-digest.patch.yml', import.meta.url))
const repoTsconfig = fileURLToPath(new URL('../../../../tsconfig.json', import.meta.url))
const expectedPath = fileURLToPath(new URL('./expected/error-digest.expected.md', import.meta.url))

async function jsonlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return jsonlFiles(path)
    return entry.isFile() && entry.name.endsWith('.jsonl') ? [path] : []
  }))
  return nested.flat()
}

describe('error digest through the production headless profile', () => {
  it('records the failed tool and its prompt in the same session', async () => {
    let events: SessionEvent[] = []
    const { stderr } = await runLoaderSmoke({
      label: 'error digest headless smoke',
      tempDirPrefix: 'error-digest-e2e-',
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
    expect(events.some(event => event.type === 'tool/result' && event.data.message.isError)).toBe(true)
    const prompts = events.filter((event): event is SessionEvent<'system/message'> => event.type === 'system/message')
      .map(event => event.data.message.content.filter(block => block.type === 'text').map(block => block.text).join('\n'))
    const prompt = prompts.find(value => value.includes('## Recent Errors'))
    expect(prompt).toBeDefined()
    const lines = prompt!.split('\n')
    const start = lines.indexOf('## Recent Errors')
    expect(lines.slice(start, start + 3).join('\n') + '\n').toBe(await readFile(expectedPath, 'utf8'))
  }, LOADER_SMOKE_TEST_TIMEOUT_MS)
})
