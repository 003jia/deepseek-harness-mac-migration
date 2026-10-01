/**
 * Update check for the dsh installation against official DeepSeek Harness
 * GitHub Releases.
 * @module @deepseek-ai/dsh-host-update-check
 */

import { createRequire } from 'node:module'
import { execFile } from 'node:child_process'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import type { Context } from '@deepseek-ai/cordis'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import type {} from 'zod'
import type { DesktopInstaller, SourceUpgradeResult, UpdateCheckResult } from './types.ts'

export type * from './types.ts'

/** Optional values used to identify the running desktop or Web package. */
export interface Config {
  /** Installed application version compared with official releases. */
  currentVersion?: string
  /** Source checkout used by the optional side-by-side upgrade action. */
  sourceRoot?: string
}

/** Official repository's published release collection. */
const RELEASES_API_URL = 'https://api.github.com/repos/deepseek-ai/deepseek-harness/releases?per_page=100'
const OFFICIAL_GIT_URL = 'https://github.com/deepseek-ai/deepseek-harness.git'
const runFile = promisify(execFile)

async function git(cwd: string, args: readonly string[]): Promise<string> {
  const { stdout } = await runFile('git', [...args], { cwd, timeout: 120_000, maxBuffer: 1024 * 1024 })
  return stdout.trim()
}

/** Stage a release in a separate worktree and replay this branch's custom commits.
 * @param root - clean DeepSeek Harness Git checkout.
 * @param tag - official release tag.
 * @param version - release version shown in the result and directory name.
 * @param gitUrl - official repository URL, overridable for local Git tests.
 * @returns staged checkout path and rebase status.
 */
export async function stageSourceUpgrade(
  root: string, tag: string, version: string, gitUrl = OFFICIAL_GIT_URL,
): Promise<SourceUpgradeResult> {
  const sourceRoot = resolve(root)
  const manifest = JSON.parse(await readFile(join(sourceRoot, 'package.json'), 'utf8')) as { name?: string }
  if (manifest.name !== '@deepseek-ai/dsh-root') throw new Error('source upgrade requires a DeepSeek Harness checkout')
  await stat(join(sourceRoot, '.git'))
  if (await git(sourceRoot, ['status', '--porcelain', '--untracked-files=normal']) !== '') {
    throw new Error('commit or move local changes before preparing an update')
  }
  if (await git(sourceRoot, ['branch', '--show-current']) === '') {
    throw new Error('source upgrade requires a named Git branch')
  }
  if (!/^dsh-v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag)) {
    throw new Error('official release tag is invalid')
  }
  await git(sourceRoot, ['fetch', '--no-tags', gitUrl, `refs/tags/${tag}`])
  const target = await git(sourceRoot, ['rev-parse', 'FETCH_HEAD^{commit}'])
  const base = await git(sourceRoot, ['merge-base', 'HEAD', target])
  const worktrees = join(dirname(sourceRoot), 'dsh-upgrades')
  await mkdir(worktrees, { recursive: true })
  const destination = join(worktrees, `upgrade-${version}-${randomUUID().slice(0, 8)}`)
  const branch = `upgrade/${tag}-${Date.now()}`
  await git(sourceRoot, ['worktree', 'add', '-b', branch, destination, 'HEAD'])
  try {
    await git(destination, ['rebase', '--onto', target, base])
    return { status: 'prepared', path: destination, version }
  } catch {
    const conflicts = await git(destination, ['diff', '--name-only', '--diff-filter=U']).catch(() => '')
    if (conflicts !== '') return { status: 'conflicts', path: destination, version }
    throw new Error(`source update failed in ${destination}; inspect the staged worktree`)
  }
}

/** GitHub release fields consumed from the external API response. */
interface GitHubRelease {
  readonly draft?: unknown
  readonly tag_name?: unknown
  readonly html_url?: unknown
  readonly published_at?: unknown
  readonly assets?: unknown
}

/** GitHub release asset fields that may point to a desktop installer. */
interface GitHubReleaseAsset {
  readonly name?: unknown
  readonly browser_download_url?: unknown
  readonly digest?: unknown
}

/** Parsed SemVer precedence fields. */
interface ParsedVersion {
  readonly major: bigint
  readonly minor: bigint
  readonly patch: bigint
  readonly prerelease: readonly string[]
}

/** Parse a release tag after removing the official repository's tag prefixes. */
function parseReleaseVersion(tag: string): ParsedVersion | undefined {
  const unprefixed = tag.replace(/^dsh-/, '').replace(/^v/, '')
  const match = new RegExp(
    '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)' +
    '(?:-([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?' +
    '(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$',
  ).exec(unprefixed)
  if (match === null) return undefined

  const [, major, minor, patch, prereleaseText] = match
  if (major === undefined || minor === undefined || patch === undefined) return undefined
  const prerelease = prereleaseText?.split('.') ?? []
  if (prerelease.some(identifier => /^\d+$/.test(identifier) && identifier.length > 1 && identifier.startsWith('0'))) {
    return undefined
  }

  return {
    major: BigInt(major),
    minor: BigInt(minor),
    patch: BigInt(patch),
    prerelease,
  }
}

/** Compare valid semantic versions by SemVer precedence. */
function compareVersions(left: ParsedVersion, right: ParsedVersion): number {
  if (left.major !== right.major) return left.major < right.major ? -1 : 1
  if (left.minor !== right.minor) return left.minor < right.minor ? -1 : 1
  if (left.patch !== right.patch) return left.patch < right.patch ? -1 : 1

  if (left.prerelease.length === 0 || right.prerelease.length === 0) {
    if (left.prerelease.length === right.prerelease.length) return 0
    return left.prerelease.length === 0 ? 1 : -1
  }

  const sharedLength = Math.min(left.prerelease.length, right.prerelease.length)
  for (let index = 0; index < sharedLength; index++) {
    const a = left.prerelease[index]
    const b = right.prerelease[index]
    if (a === undefined || b === undefined) continue
    if (a === b) continue
    const aNumeric = /^\d+$/.test(a)
    const bNumeric = /^\d+$/.test(b)
    if (aNumeric && bNumeric) return BigInt(a) < BigInt(b) ? -1 : 1
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1
    return a < b ? -1 : 1
  }
  return Math.sign(left.prerelease.length - right.prerelease.length)
}

/** Read and validate one GitHub Releases API item. */
function isGitHubRelease(value: unknown): value is GitHubRelease {
  return typeof value === 'object' && value !== null
}

/** Read one GitHub release asset object from an external API payload. */
function isGitHubReleaseAsset(value: unknown): value is GitHubReleaseAsset {
  return typeof value === 'object' && value !== null
}

/** Verify that a GitHub URL stays on DeepSeek Harness's official release pages. */
function isOfficialReleaseUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && url.hostname === 'github.com'
      && url.pathname.startsWith('/deepseek-ai/deepseek-harness/releases/tag/')
  } catch {
    return false
  }
}

/** Verify that an asset download URL stays on the official GitHub repository. */
function isOfficialAssetUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && url.hostname === 'github.com'
      && url.pathname.startsWith('/deepseek-ai/deepseek-harness/releases/download/')
  } catch {
    return false
  }
}

/** Keep only GitHub timestamps that can be represented by a Date. */
function readPublishedAt(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null
}

/** File suffixes that GitHub release assets use for each desktop platform. */
function desktopInstallerSuffixes(): readonly string[] {
  switch (process.platform) {
    case 'darwin': return ['.dmg', '.pkg', '.zip']
    case 'win32': return ['.exe', '.msi']
    case 'linux': return ['.appimage', '.deb', '.rpm']
    default: return []
  }
}

/** Select the first official installer asset applicable to the running platform. */
function readDesktopInstaller(value: unknown, tag: string): DesktopInstaller | null {
  if (!Array.isArray(value)) return null
  const suffixes = desktopInstallerSuffixes()
  if (suffixes.length === 0) return null
  const installers: DesktopInstaller[] = []
  for (const candidate of value.filter(isGitHubReleaseAsset)) {
    const name = candidate.name
    const url = candidate.browser_download_url
    if (typeof name !== 'string' || !isOfficialAssetUrl(url)) continue
    if (!suffixes.some(suffix => name.toLowerCase().endsWith(suffix))) continue
    const path = new URL(url).pathname.split('/')
    let assetTag: string
    let assetName: string
    try {
      assetTag = decodeURIComponent(path[5] ?? '')
      assetName = decodeURIComponent(path[6] ?? '')
    } catch {
      continue
    }
    if (path.length !== 7 || assetTag !== tag || assetName !== name) continue
    const lowerName = name.toLowerCase()
    const arm = /(?:^|[-_.])(arm64|aarch64)(?:[-_.]|$)/.test(lowerName)
    const x64 = /(?:^|[-_.])(x64|x86_64|amd64)(?:[-_.]|$)/.test(lowerName)
    if ((arm && process.arch !== 'arm64') || (x64 && process.arch !== 'x64')) continue
    const digest = typeof candidate.digest === 'string' && /^sha256:[a-f0-9]{64}$/i.test(candidate.digest)
      ? candidate.digest.slice(7).toLowerCase()
      : undefined
    installers.push({ name, url, ...(digest === undefined ? {} : { sha256: digest }) })
  }
  return installers.find((installer) => {
    const lowerName = installer.name.toLowerCase()
    return process.arch === 'arm64'
      ? /(?:^|[-_.])(arm64|aarch64)(?:[-_.]|$)/.test(lowerName)
      : /(?:^|[-_.])(x64|x86_64|amd64)(?:[-_.]|$)/.test(lowerName)
  }) ?? installers[0] ?? null
}

/** Remote-only service reporting whether a newer official dsh release exists. */
export class UpdateCheckGateway extends TypertRemoteService {
  /** The running version compared against the newest published official release. */
  readonly currentVersion: string
  private readonly sourceRoot: string | undefined

  constructor(ctx: Context, config: Config = {}) {
    super(ctx, 'updateCheck')
    this.sourceRoot = config.sourceRoot
    this.currentVersion = config.currentVersion
      ?? (() => {
        try {
          const manifest = createRequire(import.meta.url)('@deepseek-ai/dsh-web-app/package.json') as { version?: string }
          return manifest.version ?? ''
        } catch {
          return ''
        }
      })()
  }

  /**
   * Compare the running version with the highest published official release.
   * @returns the current/latest official versions plus their official release links.
   */
  @Remote('check')
  async check(): Promise<UpdateCheckResult> {
    const response = await fetch(RELEASES_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (!response.ok) {
      throw new Error(`official GitHub Releases request failed: ${response.status} ${response.statusText}`)
    }

    const payload: unknown = await response.json()
    if (!Array.isArray(payload)) {
      throw new Error('official GitHub Releases response was not a release list')
    }

    const releases = payload
      .filter(isGitHubRelease)
      .filter(release => release.draft !== true && typeof release.tag_name === 'string')
      .flatMap((release) => {
        const tag = release.tag_name as string
        const version = parseReleaseVersion(tag)
        const releaseUrl = release.html_url
        if (version === undefined || !isOfficialReleaseUrl(releaseUrl)) return []
        return [{
          tag,
          version,
          releaseUrl,
          publishedAt: readPublishedAt(release.published_at),
          desktopInstaller: readDesktopInstaller(release.assets, tag),
        }]
      })
      .sort((left, right) => compareVersions(right.version, left.version))
    const latest = releases[0]
    if (latest === undefined) {
      throw new Error('official DeepSeek Harness Releases contains no published semantic versions')
    }

    const current = parseReleaseVersion(this.currentVersion)
    return {
      currentVersion: this.currentVersion.length === 0 ? null : this.currentVersion,
      latestVersion: latest.tag.replace(/^dsh-/, '').replace(/^v/, ''),
      updateAvailable: current !== undefined && compareVersions(current, latest.version) < 0,
      releaseUrl: latest.releaseUrl,
      publishedAt: latest.publishedAt,
      desktopInstaller: latest.desktopInstaller,
    }
  }

  /** Prepare a newer official source release while keeping the running checkout intact.
   * @returns staged checkout path and rebase status, or an up-to-date result.
   */
  @Remote('stageSource')
  async stageSource(): Promise<SourceUpgradeResult> {
    if (this.sourceRoot === undefined) throw new Error('source updates are not configured for this installation')
    const release = await this.check()
    if (!release.updateAvailable) return { status: 'up-to-date', path: null, version: release.latestVersion }
    const tag = decodeURIComponent(new URL(release.releaseUrl).pathname.split('/').at(-1) ?? '')
    return stageSourceUpgrade(this.sourceRoot, tag, release.latestVersion)
  }
}

export default UpdateCheckGateway
