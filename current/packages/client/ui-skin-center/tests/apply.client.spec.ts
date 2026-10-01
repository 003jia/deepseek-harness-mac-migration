// @vitest-environment jsdom
/** Client apply wiring: locale dictionaries, settings scope binding, section registration, DOM projection start. */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { TestRemote, usePinnedBrowserLanguages } from '@deepseek-ai/dsh-client-test-runtime'
import { apply as applySettings, inject as settingsInject } from '@deepseek-ai/dsh-client-ui-settings/client'
import { apply, inject, SETTINGS_NS } from '../src/client/index.ts'
import { SkinCenterSection } from '../src/client/SkinCenterSection.tsx'
import { SkinCenterSettingsSchema, SKIN_CENTER_SETTINGS_NAMESPACE } from '../src/skin-settings.ts'

// These specs assert the shipped Chinese copy first, so they state the
// browser they assume.
usePinnedBrowserLanguages('zh-CN')

const SLOT = 'settings.section'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  const namespace = () => ({
    ns: SKIN_CENTER_SETTINGS_NAMESPACE,
    schema: SkinCenterSettingsSchema.toJSON(),
    value: {},
    applies: 'live' as const,
    secrets: [],
    revision: 0,
  })
  const describeSettings = vi.fn(() => Promise.resolve({
    rpcId: 'skin-describe' as never,
    result: { ok: true as const, value: { writable: true, hasDocument: true, namespaces: [namespace()] } },
  }))
  const mutate = vi.fn(() => Promise.resolve({
    rpcId: 'skin-mutate' as never,
    result: { ok: true as const, value: namespace() },
  }))
  const rpcCall = vi.fn(() => Promise.resolve({ ok: true as const, value: {} }))
  ctx.provide('connection', {
    api: { settings: { describe: describeSettings, mutate } },
    isLoopback: true,
    rpc: { call: rpcCall },
  } as never)
  new TestRemote(ctx)
  await ctx.plugin({ inject: [...settingsInject], apply: applySettings }).await()
  return { ctx, slots: ctx.get('slots') as SlotRegistry, locale, describeSettings, mutate }
}

/** Stand in for the settings shell: declare the section list slot from root. */
function declareSections(slots: SlotRegistry): () => void {
  return slots.register(
    { name: 'root', children: { [SLOT]: { kind: 'list', scope: 'root' } } } as never,
    () => null,
  )
}

describe('ui-skin-center apply', () => {
  it('declares the inject face', () => {
    expect(inject).toEqual(['slots', 'locale', 'connection', 'remote', 'settingsScope'])
  })

  it('registers copy, the section entry, and paints the DOM projection from boot', async () => {
    const b = await bench()
    declareSections(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()

    expect(b.locale.bind(SETTINGS_NS)('nav')).toBe('皮肤中心')
    b.locale.setLocale('en')
    expect(b.locale.bind(SETTINGS_NS)('nav')).toBe('Skin Center')

    const entry = b.slots.entries(SLOT).find(e => e.component === SkinCenterSection)!
    expect(entry.options).toMatchObject({ id: 'skin-center', order: 30 })
    expect((entry.options as { label: () => string }).label()).toBe('Skin Center')
    const face = (entry.inject as () => { controller: unknown; t: (key: 'nav') => string })()
    expect(face.controller).toBeInstanceOf(Object)
    expect(face.t('nav')).toBe('Skin Center')

    // The stylesheet is injected and the defaults are painted before the scope settles.
    expect(document.getElementById('dsh-skin-center/background-styles')).toBeTruthy()
    expect(document.documentElement.style.getPropertyValue('--dsw-glass-opacity')).toBe('85%')
    expect(document.documentElement.style.getPropertyValue('--dsw-glass-blur')).toBe('12px')
    await vi.waitFor(() => { expect(b.describeSettings).toHaveBeenCalledOnce() })
  })

  it('teardown removes the section and the dictionaries', async () => {
    const b = await bench()
    declareSections(b.slots)
    const fiber = await b.ctx.plugin({ inject: [...inject], apply }).await()
    expect(b.slots.entries(SLOT).some(e => e.component === SkinCenterSection)).toBe(true)
    await fiber.dispose()
    expect(b.slots.entries(SLOT)).toHaveLength(0)
    expect(b.locale.bind(SETTINGS_NS)('nav')).toBe('nav')
  })
})
