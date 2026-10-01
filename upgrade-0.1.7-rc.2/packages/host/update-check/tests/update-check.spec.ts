import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { UpdateCheckGateway } from '../src/index.ts'

const contexts: Context[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  vi.unstubAllGlobals()
})

async function gateway(currentVersion: string): Promise<UpdateCheckGateway> {
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(UpdateCheckGateway, { currentVersion })
  return ctx.get('updateCheck') as UpdateCheckGateway
}

function stubReleases(releases: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => Response.json(releases))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function release(tag: string, options: { draft?: boolean; assets?: unknown; publishedAt?: string } = {}) {
  return {
    draft: options.draft,
    tag_name: tag,
    html_url: `https://github.com/deepseek-ai/deepseek-harness/releases/tag/${tag}`,
    published_at: options.publishedAt,
    assets: options.assets,
  }
}

describe('UpdateCheckGateway', () => {
  it('reads the official repository releases and compares the highest published SemVer', async () => {
    const fetchMock = stubReleases([
      null,
      release('99.0.0', { draft: true }),
      { tag_name: '10.0.0-01' },
      release('0.1.0+build.1'),
      release('0.2.0'),
      release('1.0.0-alpha.2'),
      release('1.0.0-alpha.10'),
      release('1.0.0-beta'),
      release('dsh-v1.0.0', { publishedAt: '2026-09-22T06:16:27Z' }),
    ])
    const service = await gateway('0.1.6-alpha.2')

    await expect(service.check()).resolves.toEqual({
      currentVersion: '0.1.6-alpha.2',
      latestVersion: '1.0.0',
      updateAvailable: true,
      releaseUrl: 'https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v1.0.0',
      publishedAt: '2026-09-22T06:16:27Z',
      desktopInstaller: null,
    })
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.github.com/repos/deepseek-ai/deepseek-harness/releases?per_page=100',
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )
  })

  it('orders prerelease identifiers by SemVer rules and ignores an invalid current version', async () => {
    stubReleases([
      release('v2.0.0-rc.2'),
      release('dsh-v2.0.0-rc.10'),
      release('2.0.0-rc.10.beta'),
      release('2.0.0-beta'),
      release('2.0.0-alpha'),
    ])
    const service = await gateway('not-a-version')

    await expect(service.check()).resolves.toEqual({
      currentVersion: 'not-a-version',
      latestVersion: '2.0.0-rc.10.beta',
      updateAvailable: false,
      releaseUrl: 'https://github.com/deepseek-ai/deepseek-harness/releases/tag/2.0.0-rc.10.beta',
      publishedAt: null,
      desktopInstaller: null,
    })
  })

  it('does not report an update when the installed version matches or exceeds the latest', async () => {
    stubReleases([release('3.4.5')])
    const service = await gateway('3.4.5')
    await expect(service.check()).resolves.toMatchObject({ updateAvailable: false })

    const newerService = await gateway('3.4.6')
    await expect(newerService.check()).resolves.toMatchObject({ updateAvailable: false })
  })

  it('selects a platform installer only from the official release downloads', async () => {
    const extension = process.platform === 'darwin'
      ? '.dmg'
      : process.platform === 'win32'
        ? '.msi'
        : process.platform === 'linux'
          ? '.AppImage'
          : undefined
    if (extension === undefined) return
    const name = `DeepSeek-Harness${extension}`
    stubReleases([release('0.2.0', {
      assets: [
        { name: 'source.tar.gz', browser_download_url: 'https://github.com/deepseek-ai/deepseek-harness/archive/refs/tags/0.2.0.tar.gz' },
        { name, browser_download_url: `https://github.com/deepseek-ai/deepseek-harness/releases/download/0.2.0/${name}` },
        { name: `untrusted${extension}`, browser_download_url: `https://example.test/${name}` },
      ],
    })])
    const service = await gateway('0.1.0')

    await expect(service.check()).resolves.toMatchObject({
      desktopInstaller: {
        name,
        url: `https://github.com/deepseek-ai/deepseek-harness/releases/download/0.2.0/${name}`,
      },
    })
  })

  it('prefers the running architecture and carries an official SHA-256 digest', async () => {
    const extension = process.platform === 'darwin' ? '.dmg' : process.platform === 'win32' ? '.exe' : '.AppImage'
    const matchingArch = process.arch === 'arm64' ? 'arm64' : 'x64'
    const otherArch = process.arch === 'arm64' ? 'x64' : 'arm64'
    const asset = (arch: string, digest?: string) => {
      const name = `DeepSeek-Harness-${arch}${extension}`
      return {
        name,
        browser_download_url: `https://github.com/deepseek-ai/deepseek-harness/releases/download/dsh-v0.2.0/${name}`,
        digest,
      }
    }
    stubReleases([release('dsh-v0.2.0', {
      assets: [asset(otherArch), asset(matchingArch, `sha256:${'a'.repeat(64)}`)],
    })])
    const service = await gateway('0.1.0')
    await expect(service.check()).resolves.toMatchObject({
      desktopInstaller: {
        name: `DeepSeek-Harness-${matchingArch}${extension}`,
        sha256: 'a'.repeat(64),
      },
    })
  })

  it('reports an unknown installed version as null', async () => {
    stubReleases([release('0.1.0')])
    const service = await gateway('')
    await expect(service.check()).resolves.toEqual({
      currentVersion: null,
      latestVersion: '0.1.0',
      updateAvailable: false,
      releaseUrl: 'https://github.com/deepseek-ai/deepseek-harness/releases/tag/0.1.0',
      publishedAt: null,
      desktopInstaller: null,
    })
  })

  it('rejects failed requests, malformed payloads, and release lists without valid versions', async () => {
    const service = await gateway('0.1.0')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('unavailable', { status: 503, statusText: 'Unavailable' })))
    await expect(service.check()).rejects.toThrow('official GitHub Releases request failed: 503 Unavailable')

    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ releases: [] })))
    await expect(service.check()).rejects.toThrow('official GitHub Releases response was not a release list')

    vi.stubGlobal('fetch', vi.fn(async () => Response.json([
      release('1.0.0', { draft: true }),
      { tag_name: '1.0.0-00' },
      { tag_name: 'release-1' },
    ])))
    await expect(service.check()).rejects.toThrow('official DeepSeek Harness Releases contains no published semantic versions')
  })
})
