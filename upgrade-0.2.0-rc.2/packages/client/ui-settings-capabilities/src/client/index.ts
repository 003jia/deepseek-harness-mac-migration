/** Skill, MCP and subagent settings contributions. @module */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { CapabilityConfig, CapabilityKind, CapabilitySnapshot } from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { CapabilitySettings } from './CapabilitySettings.tsx'
import type { CapabilitySettingsInjected } from './CapabilitySettings.tsx'
import { en, zh } from './locales.ts'
import type { CapabilitiesLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'settings.capabilities': CapabilitiesLocaleKey }
}

const NS = 'settings.capabilities'
/** Generated management endpoints selected by the Host Remote assembly. */
export const inject = ['slots', 'locale', 'remote', 'remote.capabilityManager']

/** Register one independently addressable page per capability family. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-settings-capabilities: dictionaries')
  const t = ctx.locale.bind(NS)
  const state = createSnapshotStore<CapabilitySnapshot | null>(null)
  const accept = (result: Awaited<ReturnType<typeof ctx.remote.capabilityManager.snapshot>>) => {
    if (!result.ok) throw new Error(result.error.message)
    state.set(result.value)
  }
  const actions: Omit<CapabilitySettingsInjected, 'kind'> = {
    hooks: { capabilities: state },
    load: async () => { accept(await ctx.remote.capabilityManager.snapshot()) },
    save: async (id, kind, name, config: CapabilityConfig, enabled) => {
      accept(await ctx.remote.capabilityManager.save(id, kind, name, config, enabled))
    },
    toggle: async (id, enabled) => { accept(await ctx.remote.capabilityManager.toggle(id, enabled)) },
    remove: async (id) => { accept(await ctx.remote.capabilityManager.removeEntry(id)) },
    reconnect: async (id) => { accept(await ctx.remote.capabilityManager.reconnect(id)) },
  }
  const register = (kind: CapabilityKind, id: string, order: number, label: CapabilitiesLocaleKey) => ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id, order, label: () => t(label), locale: NS,
    inject: () => ({ ...actions, kind }),
  }, CapabilitySettings))

  register('skill', 'skills', 25, 'skills')
  register('mcp', 'mcp', 26, 'mcp')
  register('subagent', 'subagents', 27, 'subagents')
}
