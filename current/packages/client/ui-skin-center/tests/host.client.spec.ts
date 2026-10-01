/** Host half: durable namespace registration, upload/remove RPC results, image route. */
import { mkdtempSync, realpathSync, rmSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsProvider, settingsNamespace, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  apply, handleSkinCenterRpc, serveBackgroundImage,
} from '../src/index.ts'
import {
  DEFAULT_SKIN_CENTER_SETTINGS, SKIN_CENTER_SETTINGS_NAMESPACE,
} from '../src/skin-settings.ts'
import { removeBackgroundImage, saveBackgroundImage } from '../src/background-store.ts'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  protected load(): Promise<Record<string, unknown>> { return Promise.resolve({}) }
  protected persist(_ns: SettingsNamespace, _section: Record<string, unknown>): Promise<void> {
    return Promise.resolve()
  }
}

let home: string | undefined

function tmpHome(): string {
  home ??= realpathSync(mkdtempSync(join(tmpdir(), 'dsh-skin-center-host-')))
  return home
}

afterEach(() => {
  if (home !== undefined) rmSync(home, { recursive: true, force: true })
  home = undefined
})

/** Minimal request/response doubles for the image route. */
function requestDouble(method: string, url: string): IncomingMessage {
  return { method, url } as IncomingMessage
}

function responseDouble() {
  const state = { status: 0, headers: {} as Record<string, unknown>, body: new Uint8Array(0) }
  const res = {
    writeHead(status: number, headers?: Record<string, unknown>) {
      state.status = status
      state.headers = headers ?? {}
      return res as unknown as ServerResponse
    },
    end(body?: Uint8Array) {
      if (body !== undefined) state.body = new Uint8Array(body)
      return res as unknown as ServerResponse
    },
  }
  return { res: res as unknown as ServerResponse, state }
}

function base64Of(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}

describe('ui-skin-center host', () => {
  it('registers, defaults, and disposes the durable namespace with its fiber', async () => {
    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    const fiber = ctx.plugin({ apply })
    await fiber.await()
    const ns = settingsNamespace(SKIN_CENTER_SETTINGS_NAMESPACE)
    expect(ctx.settings.get(ns)).toEqual(DEFAULT_SKIN_CENTER_SETTINGS)
    await ctx.settings.update(ns, { glassOpacity: 40 })
    expect(ctx.settings.get(ns)).toMatchObject({ glassOpacity: 40 })
    await expect(ctx.settings.update(ns, { glassOpacity: 5 })).rejects.toThrow()
    await fiber.dispose()
    expect(ctx.settings.describe().map(row => row.ns)).not.toContain(ns)
  })

  it('registers the RPC channel and image route on their optional services', async () => {
    const ctx = new Context()
    const handle = vi.fn((_channel: string, _handler: unknown, _options: unknown) => () => Promise.resolve())
    const register = vi.fn((_route: unknown) => () => {})
    ctx.provide('connection', { rpc: { handle } })
    ctx.provide('webServer', { register })
    const fiber = ctx.plugin({ apply })
    await fiber.await()
    expect(handle).toHaveBeenCalledWith('/skin-center', expect.any(Function), { authority: 'trusted-host' })
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ kind: 'prefix', path: '/skin-center-image' }))
    // The registered wrappers delegate to the same handlers the direct tests
    // exercise; wiring them once pins the delegation itself.
    const rpcHandler = handle.mock.calls[0]?.[1] as (endpoint: string, payload: unknown) => Promise<unknown>
    await expect(rpcHandler('background/nope', {})).resolves.toMatchObject({ ok: false })
    const route = register.mock.calls[0]?.[0] as unknown as { handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> }
    const answer = responseDouble()
    await route.handler(requestDouble('GET', '/skin-center-image/none'), answer.res)
    expect(answer.state.status).toBe(404)

    await fiber.dispose()
    expect(handle.mock.calls[0]?.[1]).toBeDefined()
    expect(register.mock.results[0]?.value).toBeInstanceOf(Function)
  })

  it('upload stores bytes and answers with the ref; failures fold into bad-request', async () => {
    const deps = {
      save: (data: Uint8Array, extension: string) => saveBackgroundImage(data, extension, tmpHome()),
    }
    const ok = await handleSkinCenterRpc('background/upload', {
      name: 'cat.gif', dataBase64: base64Of(new Uint8Array([7, 7, 7])),
    }, deps)
    expect(ok.ok).toBe(true)
    const ref = ok.ok ? ok.value.ref : undefined
    expect(typeof ref).toBe('string')

    const badExt = await handleSkinCenterRpc('background/upload', { name: 'a.txt', dataBase64: 'eA==' }, deps)
    expect(badExt).toMatchObject({ ok: false, error: { code: 'bad-request' } })

    const notJson = await handleSkinCenterRpc('background/upload', 'nope', deps)
    expect(notJson).toMatchObject({ ok: false, error: { code: 'bad-request' } })

    const badBase64 = await handleSkinCenterRpc('background/upload', { name: 'a.gif', dataBase64: '###' }, deps)
    expect(badBase64).toMatchObject({ ok: false, error: { code: 'bad-request' } })

    const nonStringData = await handleSkinCenterRpc('background/upload', { name: 'a.gif', dataBase64: 123 }, deps)
    expect(nonStringData).toMatchObject({ ok: false, error: { code: 'bad-request' } })

    const emptyData = await handleSkinCenterRpc('background/upload', { name: 'a.gif', dataBase64: '' }, deps)
    expect(emptyData).toMatchObject({ ok: false, error: { code: 'bad-request' } })

    const noExtension = await handleSkinCenterRpc('background/upload', { name: 'avatar', dataBase64: 'eA==' }, deps)
    expect(noExtension).toMatchObject({ ok: false, error: { code: 'bad-request' } })

    const dotFile = await handleSkinCenterRpc('background/upload', { name: '.gif', dataBase64: 'eA==' }, deps)
    expect(dotFile).toMatchObject({ ok: false, error: { code: 'bad-request' } })

    const nonStringName = await handleSkinCenterRpc('background/upload', { name: 7, dataBase64: 'eA==' }, deps)
    expect(nonStringName).toMatchObject({ ok: false, error: { code: 'bad-request' } })

    const empty = await handleSkinCenterRpc('background/upload', undefined, deps)
    expect(empty).toMatchObject({ ok: false, error: { code: 'bad-request' } })

    const unknown = await handleSkinCenterRpc('background/nope', {}, deps)
    expect(unknown).toMatchObject({ ok: false, error: { code: 'bad-request' } })
  })

  it('remove deletes the stored file and reports; invalid refs refuse', async () => {
    const deps = {
      remove: (ref: string) => removeBackgroundImage(ref, tmpHome()),
    }
    const ref = await saveBackgroundImage(new Uint8Array([5]), '.webp', tmpHome())
    const removed = await handleSkinCenterRpc('background/remove', { ref }, deps)
    expect(removed).toEqual({ ok: true, value: { removed: true } })
    const again = await handleSkinCenterRpc('background/remove', { ref }, deps)
    expect(again).toEqual({ ok: true, value: { removed: false } })
    const invalid = await handleSkinCenterRpc('background/remove', { ref: '../x.gif' }, deps)
    expect(invalid).toMatchObject({ ok: false, error: { code: 'bad-request' } })
  })

  it('serves stored images to GET only, 404 on unknown refs', async () => {
    const deps = { read: async (_ref: string) => ({ body: Buffer.from([1]), mediaType: 'image/png' }) }
    const get = responseDouble()
    await serveBackgroundImage(requestDouble('GET', '/skin-center-image/AAAAAAAAAAAAAAAAAAAAAA.png'), get.res, deps)
    expect(get.state.status).toBe(200)
    expect(get.state.headers['content-type']).toBe('image/png')
    expect(get.state.headers['cache-control']).toBe('no-store')

    const post = responseDouble()
    await serveBackgroundImage(requestDouble('POST', '/skin-center-image/x.png'), post.res, deps)
    expect(post.state.status).toBe(405)

    const missing = { read: async () => undefined }
    const notFound = responseDouble()
    await serveBackgroundImage(requestDouble('GET', '/skin-center-image/nope'), notFound.res, missing)
    expect(notFound.state.status).toBe(404)
  })

  it('runs the production store defaults against the resolved harness home', async () => {
    const previous = process.env.DSH_HOME
    process.env.DSH_HOME = tmpHome()
    try {
      const uploaded = await handleSkinCenterRpc('background/upload', {
        name: 'loop.gif', dataBase64: base64Of(new Uint8Array([2, 2])),
      })
      expect(uploaded.ok).toBe(true)
      const ref = uploaded.ok ? uploaded.value.ref : undefined
      expect(typeof ref).toBe('string')
      if (typeof ref !== 'string') return

      const served = responseDouble()
      await serveBackgroundImage(requestDouble('GET', `/skin-center-image/${ref}`), served.res)
      expect(served.state.status).toBe(200)
      expect([...served.state.body]).toEqual([2, 2])

      const removed = await handleSkinCenterRpc('background/remove', { ref })
      expect(removed).toEqual({ ok: true, value: { removed: true } })
    } finally {
      if (previous === undefined) delete process.env.DSH_HOME
      else process.env.DSH_HOME = previous
    }
  })

  it('folds store rejections, Error or not, into bad-request', async () => {
    const failing = { save: () => Promise.reject(new Error('disk full')) }
    const saveError = await handleSkinCenterRpc('background/upload', { name: 'a.gif', dataBase64: 'eA==' }, failing)
    expect(saveError).toMatchObject({ ok: false, error: { code: 'bad-request', message: 'disk full' } })

    // A non-Error rejection is the hostile-caller arm the fold covers.
    // oxlint-disable-next-line typescript/prefer-promise-reject-errors
    const stringy = { save: () => Promise.reject('boom') }
    const stringError = await handleSkinCenterRpc('background/upload', { name: 'a.gif', dataBase64: 'eA==' }, stringy)
    expect(stringError).toMatchObject({ ok: false, error: { code: 'bad-request', message: 'boom' } })

    const removeFailing = { remove: () => Promise.reject(new Error('locked')) }
    const removeError = await handleSkinCenterRpc('background/remove', { ref: 'AAAAAAAAAAAAAAAAAAAAAA.gif' }, removeFailing)
    expect(removeError).toMatchObject({ ok: false, error: { code: 'bad-request', message: 'locked' } })

    // oxlint-disable-next-line typescript/prefer-promise-reject-errors
    const removeStringy = { remove: () => Promise.reject('busy') }
    const removeString = await handleSkinCenterRpc('background/remove', { ref: 'AAAAAAAAAAAAAAAAAAAAAA.gif' }, removeStringy)
    expect(removeString).toMatchObject({ ok: false, error: { code: 'bad-request', message: 'busy' } })
  })
})
