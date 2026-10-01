/** Host background store: persistence, cap and fence enforcement, removal. */
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  MAX_BACKGROUND_BYTES,
  backgroundMediaType,
  backgroundStoreDir,
  isBackgroundRef,
  readBackgroundImage,
  removeBackgroundImage,
  saveBackgroundImage,
} from '../src/background-store.ts'

let home: string | undefined

function tmpHome(): string {
  home ??= realpathSync(mkdtempSync(join(tmpdir(), 'dsh-skin-center-')))
  return home
}

afterEach(() => {
  if (home !== undefined) rmSync(home, { recursive: true, force: true })
  home = undefined
})

describe('background store', () => {
  it('mints a structurally valid ref and serves the stored bytes with their media type', async () => {
    const ref = await saveBackgroundImage(new Uint8Array([1, 2, 3]), '.gif', tmpHome())
    expect(isBackgroundRef(ref)).toBe(true)
    expect(ref.endsWith('.gif')).toBe(true)
    const image = await readBackgroundImage(ref, tmpHome())
    expect(image?.body).toEqual(Buffer.from([1, 2, 3]))
    expect(image?.mediaType).toBe('image/gif')
    expect(backgroundStoreDir(tmpHome()).endsWith(join('skin-center', 'backgrounds'))).toBe(true)
  })

  it('maps every allowed extension to a media type', () => {
    expect(backgroundMediaType('.gif')).toBe('image/gif')
    expect(backgroundMediaType('.png')).toBe('image/png')
    expect(backgroundMediaType('.jpg')).toBe('image/jpeg')
    expect(backgroundMediaType('.jpeg')).toBe('image/jpeg')
    expect(backgroundMediaType('.webp')).toBe('image/webp')
    expect(backgroundMediaType('.avif')).toBe('image/avif')
    expect(backgroundMediaType('.txt')).toBe('application/octet-stream')
  })

  it('rejects disallowed extensions and out-of-cap sizes', async () => {
    await expect(saveBackgroundImage(new Uint8Array([1]), '.exe', tmpHome())).rejects.toThrow(/extension/)
    await expect(saveBackgroundImage(new Uint8Array(0), '.gif', tmpHome())).rejects.toThrow(/1–/)
    await expect(saveBackgroundImage(new Uint8Array(MAX_BACKGROUND_BYTES + 1), '.gif', tmpHome()))
      .rejects.toThrow(/1–/)
  })

  it('refuses refs that are not bare store file names', async () => {
    expect(isBackgroundRef('../escape.gif')).toBe(false)
    expect(isBackgroundRef('a/b.gif')).toBe(false)
    expect(isBackgroundRef('short.gif')).toBe(false)
    expect(isBackgroundRef('.gif')).toBe(false)
    expect(isBackgroundRef('abcdefghijklmnopqrstuv.gif.sh')).toBe(false)
    expect(isBackgroundRef(123)).toBe(false)
    for (const invalid of ['../escape.gif', 'a/b.gif', 'short.gif']) {
      expect(await readBackgroundImage(invalid, tmpHome())).toBeUndefined()
      expect(await removeBackgroundImage(invalid, tmpHome())).toBe(false)
    }
  })

  it('reads miss on unknown refs and remove deletes exactly once', async () => {
    const unknown = 'AAAAAAAAAAAAAAAAAAAAAA.gif'
    expect(await readBackgroundImage(unknown, tmpHome())).toBeUndefined()
    expect(await removeBackgroundImage(unknown, tmpHome())).toBe(false)
    const ref = await saveBackgroundImage(new Uint8Array([9]), '.png', tmpHome())
    expect(await removeBackgroundImage(ref, tmpHome())).toBe(true)
    expect(await readBackgroundImage(ref, tmpHome())).toBeUndefined()
    expect(await removeBackgroundImage(ref, tmpHome())).toBe(false)
  })

  it('refuses a ref-shaped directory and an over-cap file', async () => {
    const home = tmpHome()
    const dirRef = 'BBBBBBBBBBBBBBBBBBBBBB.gif'
    mkdirSync(join(backgroundStoreDir(home), dirRef), { recursive: true })
    expect(await readBackgroundImage(dirRef, home)).toBeUndefined()

    const hugeRef = 'CCCCCCCCCCCCCCCCCCCCCC.png'
    mkdirSync(backgroundStoreDir(home), { recursive: true })
    writeFileSync(join(backgroundStoreDir(home), hugeRef), Buffer.alloc(MAX_BACKGROUND_BYTES + 1))
    expect(await readBackgroundImage(hugeRef, home)).toBeUndefined()
  })

  it('reports a read failure as a miss', async () => {
    const home = tmpHome()
    const ref = await saveBackgroundImage(new Uint8Array([4]), '.png', home)
    const path = join(backgroundStoreDir(home), ref)
    chmodSync(path, 0o000)
    try {
      expect(await readBackgroundImage(ref, home)).toBeUndefined()
    } finally {
      chmodSync(path, 0o644)
    }
  })
})
