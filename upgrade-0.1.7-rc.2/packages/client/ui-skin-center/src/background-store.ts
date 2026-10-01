/**
 * Host-side store for skin center background images. Files live under
 * `<harness home>/skin-center/backgrounds/` named `<random id><ext>`; the
 * name is minted here and never derived from user input, so a stored ref is
 * structurally path-free. Reads re-fence the resolved path under the store
 * directory and enforce the size cap again.
 * @module @deepseek-ai/dsh-client-ui-skin-center/background-store
 */

import { randomBytes } from 'node:crypto'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'

/** Image extensions the store accepts and serves. */
export const BACKGROUND_IMAGE_EXTENSIONS = ['.gif', '.png', '.jpg', '.jpeg', '.webp', '.avif'] as const

/** One accepted extension. */
export type BackgroundImageExtension = (typeof BACKGROUND_IMAGE_EXTENSIONS)[number]

/** Upper bound for one stored background image (20 MiB). */
export const MAX_BACKGROUND_BYTES = 20 * 1024 * 1024

/** Random-id length (base64url of 16 bytes); the extension is appended. */
const REF_ID_LENGTH = 22

/** Complete stored-file name shape: 22-char id plus one allowed extension. */
const REF_PATTERN = new RegExp(`^[A-Za-z0-9_-]{22}\\.(?:${BACKGROUND_IMAGE_EXTENSIONS.map(ext => ext.slice(1)).join('|')})$`)

/**
 * Store directory under a harness home.
 * @param home - harness home owning the store.
 * @returns the backgrounds directory under `<home>/skin-center/backgrounds`.
 */
export function backgroundStoreDir(home: string): string {
  return join(home, 'skin-center', 'backgrounds')
}

/**
 * Media type served for one stored extension.
 * @param extension - lowercase extension including the dot.
 * @returns the response content type.
 */
export function backgroundMediaType(extension: string): string {
  switch (extension) {
    case '.gif': return 'image/gif'
    case '.png': return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.webp': return 'image/webp'
    case '.avif': return 'image/avif'
    default: return 'application/octet-stream'
  }
}

/**
 * Whether a value is a structurally valid stored-file ref.
 * @param value - candidate ref crossing the wire or settings document.
 * @returns whether it can address a store file.
 */
export function isBackgroundRef(value: unknown): value is string {
  return typeof value === 'string' && REF_PATTERN.test(value)
}

/**
 * Persist one uploaded image and mint its reference.
 * @param data - decoded image bytes.
 * @param extension - claimed file extension including the dot; must be allowed.
 * @param home - resolved Harness home owning the store.
 * @returns the stored file's ref.
 * @throws when the extension is not allowed or the image exceeds the size cap.
 */
export async function saveBackgroundImage(
  data: Uint8Array,
  extension: string,
  home: string,
): Promise<string> {
  if (!(BACKGROUND_IMAGE_EXTENSIONS as readonly string[]).includes(extension)) {
    throw new Error(`unsupported background extension ${JSON.stringify(extension)}`)
  }
  if (data.byteLength === 0 || data.byteLength > MAX_BACKGROUND_BYTES) {
    throw new Error(`background image must be 1–${MAX_BACKGROUND_BYTES} bytes`)
  }
  const dir = backgroundStoreDir(home)
  await mkdir(dir, { recursive: true })
  const ref = `${randomBytes(16).toString('base64url')}${extension}`
  await writeFile(join(dir, ref), data)
  return ref
}

/**
 * Read one stored image for serving.
 * @param ref - stored-file reference from the request path.
 * @param home - resolved Harness home owning the store.
 * @returns the bytes with their media type, or undefined when no such capped file exists.
 */
export async function readBackgroundImage(
  ref: string,
  home: string,
): Promise<{ body: Buffer; mediaType: string } | undefined> {
  // The ref pattern excludes separators, so this fence is defense in depth
  // against a future pattern change, not the primary barrier.
  if (!isBackgroundRef(ref)) return undefined
  const dir = resolve(backgroundStoreDir(home))
  const path = resolve(join(dir, ref))
  /* v8 ignore next -- unreachable while REF_PATTERN holds: it excludes every
     separator, so a valid ref can never resolve outside the store dir. The
     fence stays as defense in depth against a future pattern regression. */
  if (!path.startsWith(`${dir}${sep}`)) return undefined
  let info
  try {
    info = await stat(path)
  } catch {
    return undefined
  }
  if (!info.isFile() || info.size > MAX_BACKGROUND_BYTES) return undefined
  try {
    return { body: await readFile(path), mediaType: backgroundMediaType(ref.slice(REF_ID_LENGTH)) }
  } catch {
    return undefined
  }
}

/**
 * Delete one stored image.
 * @param ref - stored-file reference.
 * @param home - resolved Harness home owning the store.
 * @returns whether a file was removed.
 */
export async function removeBackgroundImage(ref: string, home: string): Promise<boolean> {
  if (!isBackgroundRef(ref)) return false
  const dir = resolve(backgroundStoreDir(home))
  const path = resolve(join(dir, ref))
  /* v8 ignore next -- unreachable while REF_PATTERN holds (see readBackgroundImage). */
  if (!path.startsWith(`${dir}${sep}`)) return false
  try {
    await rm(path)
    return true
  } catch {
    return false
  }
}
