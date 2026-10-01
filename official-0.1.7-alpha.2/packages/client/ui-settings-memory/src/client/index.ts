/** Memory settings contribution. @module */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { MemorySnapshot } from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { MemorySettings } from './MemorySettings.tsx'
import type { MemorySettingsInjected } from './MemorySettings.tsx'
import { zh, en } from './locales.ts'
import type { MemoryLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'settings.memory': MemoryLocaleKey }
}

/** Required settings and generated Remote services. */
export const inject = ['slots', 'locale', 'remote', 'remote.memory']

/**
 * Register the memory page and scope its observable state to this plugin.
 * @param ctx - browser context.
 */
export function apply(ctx: ClientContext): void {
  const namespace = 'settings.memory'
  ctx.effect(() => ctx.locale.register(namespace, { zh, en }), 'memory dictionaries')
  const t = ctx.locale.bind(namespace)
  const state = createSnapshotStore<MemorySnapshot | null>(null)
  const accept = async (result: Awaited<ReturnType<typeof ctx.remote.memory.snapshot>>) => {
    if (!result.ok) throw new Error(result.error.message)
    state.set(result.value)
  }
  const actions: MemorySettingsInjected = {
    hooks: { memory: state },
    load: async () => accept(await ctx.remote.memory.snapshot()),
    preferences: async (enabled, automatic) => accept(await ctx.remote.memory.preferences(enabled, automatic)),
    save: async (id, workspace, content) => accept(await ctx.remote.memory.save(id, workspace, content)),
    remove: async id => accept(await ctx.remote.memory.deleteEntry(id)),
    extract: async id => accept(await ctx.remote.memory.extract(id)),
  }
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'memory', order: 150, label: () => t('title'), locale: namespace,
    inject: () => actions,
  }, MemorySettings))
}
