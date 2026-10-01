/** Extensions marketplace registered into Web Settings. */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { ExtensionsSettingsTab, type ExtensionsSettingsTabInjected } from './ExtensionsSettingsTab.tsx'
import { en, zh, type ExtensionsLocaleKey } from './locales.ts'

export type { ExtensionsSettingsTabInjected, ExtensionsSettingsTabProps } from './ExtensionsSettingsTab.tsx'
export type { ExtensionsLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Extensions marketplace copy. */
    'settings.extensions': ExtensionsLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.extensions'

/** Services required by the Settings registration and generated Remote face. */
export const inject = ['slots', 'locale', 'remote', 'remote.extensionsRegistry', 'remote.profileManager']

/** Contribute the extensions marketplace tab to the Plugins settings section. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-settings-extensions: dictionaries')

  const t = ctx.locale.bind(NS)
  const search: ExtensionsSettingsTabInjected['search'] = async (query: string) => {
    const result = await ctx.remote.extensionsRegistry.search(query)
    if (!result.ok) {
      throw new Error(`extensionsRegistry.search failed: ${result.error.code}: ${result.error.message}`)
    }
    return result.value
  }
  const install: ExtensionsSettingsTabInjected['install'] = async (spec: string) => {
    const result = await ctx.remote.profileManager.installPackage(spec)
    if (!result.ok) {
      throw new Error(`profileManager.installPackage failed: ${result.error.code}: ${result.error.message}`)
    }
    return result.value
  }
  const update: ExtensionsSettingsTabInjected['update'] = async (packageName: string) => {
    const result = await ctx.remote.profileManager.update(packageName)
    if (!result.ok) {
      throw new Error(`profileManager.update failed: ${result.error.code}: ${result.error.message}`)
    }
    return result.value
  }
  const remove: ExtensionsSettingsTabInjected['remove'] = async (packageName: string) => {
    const result = await ctx.remote.profileManager.removePackage(packageName)
    if (!result.ok) {
      throw new Error(`profileManager.removePackage failed: ${result.error.code}: ${result.error.message}`)
    }
    return result.value
  }
  const injected = (): ExtensionsSettingsTabInjected => ({ search, install, update, remove })

  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'extensions',
    order: 20,
    label: () => t('tab'),
    locale: NS,
    inject: injected,
  }, ExtensionsSettingsTab))
}
