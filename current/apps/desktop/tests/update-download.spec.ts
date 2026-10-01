import { createHash } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadOfficialInstaller, validateOfficialInstaller } from '../src/update-download.js'

const directories: string[] = []
const name = process.platform === 'win32' ? 'DeepSeek-Harness.exe' : process.platform === 'linux' ? 'DeepSeek-Harness.AppImage' : 'DeepSeek-Harness.dmg'
const url = `https://github.com/deepseek-ai/deepseek-harness/releases/download/dsh-v0.2.0/${name}`

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

async function downloads(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-update-test-'))
  directories.push(directory)
  return directory
}

describe('desktop installer download', () => {
  it('rejects non-official URLs and unsafe filenames before any fetch', async () => {
    expect(() => validateOfficialInstaller({ name, url: `https://example.test/${name}` })).toThrow('official')
    expect(() => validateOfficialInstaller({ name: '../bad.dmg', url })).toThrow('filename')
    expect(() => validateOfficialInstaller({ name, url: `${url}?source=other` })).toThrow('official')
    const fetchImpl = vi.fn()
    await expect(downloadOfficialInstaller({ name, url: `https://example.test/${name}` }, {
      directory: await downloads(), onProgress: vi.fn(), fetchImpl,
    })).rejects.toThrow('official')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('reports actual received bytes, verifies the digest, and preserves an existing download', async () => {
    const directory = await downloads()
    await writeFile(join(directory, name), 'existing')
    const payload = Buffer.from('official release asset')
    const sha256 = createHash('sha256').update(payload).digest('hex')
    const progress: Array<{ receivedBytes: number; totalBytes: number | null }> = []
    const fetchImpl = vi.fn(async () => new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(payload.subarray(0, 8))
        controller.enqueue(payload.subarray(8))
        controller.close()
      },
    }), { headers: { 'content-length': String(payload.length) } }))

    const result = await downloadOfficialInstaller({ name, url, sha256 }, {
      directory, onProgress: entry => progress.push(entry), fetchImpl,
    })
    expect(result.receivedBytes).toBe(payload.length)
    expect(result.path).toContain(' (1)')
    expect(await readFile(result.path)).toEqual(payload)
    expect(await readFile(join(directory, name), 'utf8')).toBe('existing')
    expect(progress.at(-1)).toEqual({ receivedBytes: payload.length, totalBytes: payload.length })
  })

  it('removes a partial file when the official digest does not match', async () => {
    const directory = await downloads()
    await expect(downloadOfficialInstaller({ name, url, sha256: '0'.repeat(64) }, {
      directory,
      onProgress: vi.fn(),
      fetchImpl: vi.fn(async () => new Response('bad')),
    })).rejects.toThrow('SHA-256')
    expect(await readdir(directory)).toEqual([])
  })

  it('removes the partial file when the user cancels the transfer', async () => {
    const directory = await downloads()
    const controller = new AbortController()
    await expect(downloadOfficialInstaller({ name, url }, {
      directory,
      signal: controller.signal,
      onProgress: () => { controller.abort(new Error('cancelled')) },
      fetchImpl: vi.fn(async () => new Response('partial installer')),
    })).rejects.toThrow('cancelled')
    expect(await readdir(directory)).toEqual([])
  })
})
