/** Download a selected official desktop installer without replacing the running source tree. */

import { createHash } from 'node:crypto'
import { open, unlink } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'

const OFFICIAL_ASSET_PATH = /^\/deepseek-ai\/deepseek-harness\/releases\/download\/[^/]+\/([^/]+)$/

/** Reject untrusted paths and URLs before creating a local file. */
export function validateOfficialInstaller(installer, platform = process.platform) {
  if (typeof installer !== 'object' || installer === null) throw new Error('Missing installer')
  const { name, url, sha256 } = installer
  if (typeof name !== 'string' || name.length === 0 || basename(name) !== name || name.includes('\\')) {
    throw new Error('Invalid installer filename')
  }
  if (sha256 !== undefined && !/^[a-f0-9]{64}$/i.test(sha256)) throw new Error('Invalid installer SHA-256')
  const suffixes = {
    darwin: ['.dmg', '.pkg', '.zip'],
    win32: ['.exe', '.msi'],
    linux: ['.appimage', '.deb', '.rpm'],
  }[platform] ?? []
  if (!suffixes.some(suffix => name.toLowerCase().endsWith(suffix))) throw new Error('Installer does not match this desktop platform')
  const lowerName = name.toLowerCase()
  const arm = /(?:^|[-_.])(arm64|aarch64)(?:[-_.]|$)/.test(lowerName)
  const x64 = /(?:^|[-_.])(x64|x86_64|amd64)(?:[-_.]|$)/.test(lowerName)
  if ((arm && process.arch !== 'arm64') || (x64 && process.arch !== 'x64')) {
    throw new Error('Installer does not match this computer architecture')
  }
  let parsed
  try { parsed = new URL(url) } catch { throw new Error('Invalid installer URL') }
  const match = OFFICIAL_ASSET_PATH.exec(parsed.pathname)
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com' || parsed.port !== ''
    || parsed.username !== '' || parsed.password !== '' || parsed.search !== '' || parsed.hash !== ''
    || match === null || decodeURIComponent(match[1]) !== name) {
    throw new Error('Installer must come from an official DeepSeek Harness release')
  }
}

/** Create a new file without overwriting an existing download or following a symlink. */
async function createDestination(directory, name) {
  const extension = extname(name)
  const stem = name.slice(0, -extension.length)
  for (let index = 0; ; index++) {
    const path = join(directory, `${stem}${index === 0 ? '' : ` (${index})`}${extension}`)
    try {
      return { path, handle: await open(path, 'wx', 0o600) }
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error
    }
  }
}

/**
 * Stream an official release asset into the user's download directory.
 * @returns the completed path and byte count; failed or aborted downloads remove their partial file.
 */
export async function downloadOfficialInstaller(installer, { directory, onProgress, signal, fetchImpl = fetch }) {
  validateOfficialInstaller(installer)
  const response = await fetchImpl(installer.url, { signal })
  if (!response.ok || response.body === null) throw new Error(`Installer download failed: HTTP ${response.status}`)
  if (response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
    throw new Error('Official installer URL returned an HTML page instead of a file')
  }
  const lengthHeader = response.headers.get('content-length')
  const length = lengthHeader === null ? NaN : Number(lengthHeader)
  const totalBytes = Number.isSafeInteger(length) && length > 0 ? length : null
  const { path, handle } = await createDestination(directory, installer.name)
  const hash = createHash('sha256')
  let receivedBytes = 0
  let complete = false
  try {
    for await (const chunk of response.body) {
      if (signal?.aborted) throw signal.reason ?? new Error('Installer download cancelled')
      await handle.writeFile(chunk)
      hash.update(chunk)
      receivedBytes += chunk.byteLength
      onProgress({ receivedBytes, totalBytes })
    }
    if (signal?.aborted) throw signal.reason ?? new Error('Installer download cancelled')
    if (totalBytes !== null && receivedBytes !== totalBytes) throw new Error('Installer download ended before all bytes arrived')
    if (installer.sha256 !== undefined && hash.digest('hex').toLowerCase() !== installer.sha256.toLowerCase()) {
      throw new Error('Official installer SHA-256 does not match the downloaded file')
    }
    complete = true
    return { path, receivedBytes }
  } finally {
    await handle.close()
    if (!complete) await unlink(path)
  }
}
