// @vitest-environment jsdom
/** Browser controller: scope adoption, DOM application, writes, preview, upload/remove flows. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import { SkinCenterController, ensureSkinStyleTag } from '../src/client/controller.ts'
import {
  DEFAULT_SKIN_CENTER_SETTINGS,
  type SkinCenterSettings,
} from '../src/skin-settings.ts'

/** Mutable settings-scope double: the controller reads snapshots and writes fields. */
function scopeDouble(initial?: Partial<SkinCenterSettings>) {
  const state = {
    value: initial === undefined ? undefined : { ...DEFAULT_SKIN_CENTER_SETTINGS, ...initial },
    listeners: new Set<() => void>(),
    writes: [] as [string, unknown][],
  }
  const scope: SettingsScope<SkinCenterSettings> = {
    getSnapshot: () => ({
      status: state.value === undefined ? 'loading' : 'ready',
      value: state.value,
      base: undefined,
      user: undefined,
      revision: state.value === undefined ? undefined : 0,
      writable: true,
      mode: 'host',
    }),
    subscribe: (listener: () => void) => {
      state.listeners.add(listener)
      return () => { state.listeners.delete(listener) }
    },
    load: () => Promise.resolve(),
    set: (field: string, value: unknown) => {
      state.writes.push([field, value])
      return Promise.resolve()
    },
    unset: (field: string) => {
      state.writes.push([field, undefined])
      return Promise.resolve()
    },
  } as unknown as SettingsScope<SkinCenterSettings>
  return {
    scope, state,
    publish: () => { for (const listener of [...state.listeners]) listener() },
  }
}

/** RPC double capturing uploads and answering a stored ref. */
function rpcDouble(result: { ref?: unknown; removed?: boolean } | 'fail') {
  const calls: { channel: string; endpoint: string; payload: unknown }[] = []
  return {
    calls,
    connection: {
      rpc: {
        call: (channel: string, endpoint: string, payload: unknown) => {
          calls.push({ channel, endpoint, payload })
          return Promise.resolve(
            result === 'fail'
              ? { ok: false as const, error: { code: 'internal' as const, message: 'store down', details: {} } }
              : { ok: true as const, value: result },
          )
        },
      },
    },
  }
}

afterEach(() => {
  document.documentElement.style.removeProperty('--dsw-glass-opacity')
  document.documentElement.style.removeProperty('--dsw-glass-blur')
  document.body.removeAttribute('data-dsh-skin-bg')
  for (const name of ['--dsh-skin-bg-image', '--dsh-skin-bg-size', '--dsh-skin-bg-scrim', '--dsh-skin-bg-blur']) {
    document.body.style.removeProperty(name)
  }
  document.getElementById('dsh-skin-center/background-styles')?.remove()
})

function glassApplied(opacity: number, blur: number): void {
  expect(document.documentElement.style.getPropertyValue('--dsw-glass-opacity')).toBe(`${opacity}%`)
  expect(document.documentElement.style.getPropertyValue('--dsw-glass-blur')).toBe(`${blur}px`)
}

const REF = 'AAAAAAAAAAAAAAAAAAAAAA.gif'

describe('skin center controller', () => {
  it('adopts scope values and paints glass plus the background layer', () => {
    const bench = scopeDouble({ glassOpacity: 55, glassBlur: 3, backgroundEnabled: true, backgroundImageRef: REF, backgroundScrimPercent: 60, backgroundBlur: 8, backgroundSize: 'contain' })
    new SkinCenterController(bench.scope, rpcDouble({ ref: REF }).connection)
    glassApplied(55, 3)
    expect(document.body.getAttribute('data-dsh-skin-bg')).toBe('')
    expect(document.body.style.getPropertyValue('--dsh-skin-bg-image'))
      .toBe('url("/skin-center-image/AAAAAAAAAAAAAAAAAAAAAA.gif")')
    expect(document.body.style.getPropertyValue('--dsh-skin-bg-size')).toBe('contain')
    expect(document.body.style.getPropertyValue('--dsh-skin-bg-scrim')).toBe('0.6')
    expect(document.body.style.getPropertyValue('--dsh-skin-bg-blur')).toBe('8px')

    bench.state.value = { ...DEFAULT_SKIN_CENTER_SETTINGS }
    bench.publish()
    glassApplied(85, 12)
    expect(document.body.hasAttribute('data-dsh-skin-bg')).toBe(false)
    expect(document.body.style.getPropertyValue('--dsh-skin-bg-image')).toBe('')
  })

  it('background stays off while enabled with no image', () => {
    const bench = scopeDouble({ backgroundEnabled: true, backgroundImageRef: '' })
    const controller = new SkinCenterController(bench.scope, rpcDouble({}).connection)
    expect(controller.getSnapshot().backgroundEnabled).toBe(true)
    expect(document.body.hasAttribute('data-dsh-skin-bg')).toBe(false)
  })

  it('set applies locally, notifies, and persists the field; preview paints without persisting', () => {
    const bench = scopeDouble()
    const controller = new SkinCenterController(bench.scope, rpcDouble({}).connection)
    const seen = vi.fn()
    controller.subscribe(seen)

    controller.preview('glassOpacity', 42)
    glassApplied(42, 12)
    expect(controller.getSnapshot().glassOpacity).toBe(42)
    expect(bench.state.writes).toEqual([])

    controller.set('glassBlur', 7)
    glassApplied(42, 7)
    expect(bench.state.writes).toEqual([['glassBlur', 7]])
    expect(seen).toHaveBeenCalledTimes(2)

    // A scope refresh overrides an optimistic value.
    bench.state.value = { ...DEFAULT_SKIN_CENTER_SETTINGS }
    bench.publish()
    glassApplied(85, 12)
  })

  it('upload base64s the file, stores the ref, and enables the background', async () => {
    const bench = scopeDouble()
    const rpc = rpcDouble({ ref: REF })
    const controller = new SkinCenterController(bench.scope, rpc.connection)
    const bytes = new Uint8Array(4 * 0x8000 + 3).fill(9)
    const file = new File([bytes], 'dance.gif', { type: 'image/gif' })

    expect(await controller.uploadBackground(file)).toBeUndefined()
    expect(rpc.calls).toEqual([{
      channel: '/skin-center',
      endpoint: 'background/upload',
      payload: { name: 'dance.gif', dataBase64: Buffer.from(bytes).toString('base64') },
    }])
    expect(bench.state.writes).toEqual([['backgroundImageRef', REF], ['backgroundEnabled', true]])
    expect(document.body.getAttribute('data-dsh-skin-bg')).toBe('')
  })

  it('a file read failure and a malformed stored-ref answer short-circuit locally', async () => {
    const bench = scopeDouble()
    const unreadable = {
      name: 'x.gif',
      arrayBuffer: () => Promise.reject(new Error('io')),
    } as unknown as File
    const readFail = new SkinCenterController(bench.scope, rpcDouble({}).connection)
    expect(await readFail.uploadBackground(unreadable)).toBe('read failed')

    const shapeless = new SkinCenterController(bench.scope, rpcDouble({ ref: 5 }).connection)
    expect(await shapeless.uploadBackground(new File([new Uint8Array([1])], 'a.gif', { type: 'image/gif' })))
      .toBe('upload returned no ref')
    expect(shapeless.getSnapshot().backgroundImageRef).toBe('')
  })

  it('remove with no stored image skips the store call', async () => {
    const bench = scopeDouble({ backgroundEnabled: true, backgroundImageRef: '' })
    const rpc = rpcDouble({ removed: false })
    const controller = new SkinCenterController(bench.scope, rpc.connection)
    await controller.removeBackground()
    expect(rpc.calls).toEqual([])
    expect(controller.getSnapshot().backgroundEnabled).toBe(false)
  })

  it('upload failures return the RPC message and change nothing', async () => {
    const bench = scopeDouble()
    const controller = new SkinCenterController(bench.scope, rpcDouble('fail').connection)
    expect(await controller.uploadBackground(new File([new Uint8Array([1])], 'x.gif', { type: 'image/gif' })))
      .toBe('store down')
    expect(bench.state.writes).toEqual([])
    expect(controller.getSnapshot().backgroundImageRef).toBe('')
  })

  it('remove clears the settings and asks the store to delete the old ref', async () => {
    const bench = scopeDouble({ backgroundEnabled: true, backgroundImageRef: REF })
    const rpc = rpcDouble({ removed: true })
    const controller = new SkinCenterController(bench.scope, rpc.connection)
    await controller.removeBackground()
    expect(bench.state.writes).toEqual([['backgroundImageRef', ''], ['backgroundEnabled', false]])
    expect(rpc.calls).toEqual([{ channel: '/skin-center', endpoint: 'background/remove', payload: { ref: REF } }])
    expect(document.body.hasAttribute('data-dsh-skin-bg')).toBe(false)
  })

  it('injects the background stylesheet once and idempotently', () => {
    ensureSkinStyleTag()
    ensureSkinStyleTag()
    const tag = document.getElementById('dsh-skin-center/background-styles')
    expect(tag?.textContent).toContain('body[data-dsh-skin-bg]::before')
    expect(tag?.textContent).toContain('body[data-ds-dark-theme][data-dsh-skin-bg]::before')
    expect(document.querySelectorAll('style#dsh-skin-center\\/background-styles')).toHaveLength(1)
  })
})
