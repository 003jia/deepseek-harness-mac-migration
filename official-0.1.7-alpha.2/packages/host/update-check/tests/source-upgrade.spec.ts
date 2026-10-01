import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { stageSourceUpgrade } from '../src/index.ts'

const runFile = promisify(execFile)
async function git(cwd: string, ...args: string[]): Promise<void> {
  await runFile('git', args, { cwd })
}

async function fixture(conflict: boolean): Promise<{
  root: string
  source: string
  official: string
}> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-source-upgrade-'))
  const source = join(root, 'source')
  const official = join(root, 'official')
  await git(root, 'init', '-b', 'main', source)
  await git(source, 'config', 'user.name', 'Upgrade Test')
  await git(source, 'config', 'user.email', 'upgrade@example.test')
  await writeFile(join(source, 'package.json'), '{"name":"@deepseek-ai/dsh-root"}\n')
  await writeFile(join(source, 'shared.txt'), 'base\n')
  await git(source, 'add', '.')
  await git(source, 'commit', '-m', 'base')
  await git(root, 'clone', source, official)
  await git(official, 'config', 'user.name', 'Upgrade Test')
  await git(official, 'config', 'user.email', 'upgrade@example.test')
  await writeFile(join(official, conflict ? 'shared.txt' : 'official.txt'), 'official\n')
  await git(official, 'add', '.')
  await git(official, 'commit', '-m', 'official release')
  await git(official, 'tag', 'dsh-v0.2.0')
  await writeFile(join(source, conflict ? 'shared.txt' : 'custom.txt'), 'custom\n')
  await git(source, 'add', '.')
  await git(source, 'commit', '-m', 'local customization')
  return { root, source, official }
}

async function dispose(root: string): Promise<void> {
  if (!basename(root).startsWith('dsh-source-upgrade-')) throw new Error('unexpected test directory')
  await rm(root, { recursive: true, force: true })
}

describe('side-by-side source upgrade', () => {
  it('replays local commits on the official tag and preserves the active checkout', async () => {
    const { root, source, official } = await fixture(false)
    try {
      const result = await stageSourceUpgrade(source, 'dsh-v0.2.0', '0.2.0', official)
      expect(result.status).toBe('prepared')
      expect((await readFile(join(result.path!, 'official.txt'), 'utf8')).trim()).toBe('official')
      expect((await readFile(join(result.path!, 'custom.txt'), 'utf8')).trim()).toBe('custom')
      await expect(readFile(join(source, 'official.txt'), 'utf8')).rejects.toThrow()
    } finally {
      await dispose(root)
    }
  })

  it('leaves conflicting customization in a separate checkout for resolution', async () => {
    const { root, source, official } = await fixture(true)
    try {
      const result = await stageSourceUpgrade(source, 'dsh-v0.2.0', '0.2.0', official)
      expect(result.status).toBe('conflicts')
      expect(result.path).not.toBeNull()
      expect((await readFile(join(source, 'shared.txt'), 'utf8')).trim()).toBe('custom')
    } finally {
      await dispose(root)
    }
  })
})
