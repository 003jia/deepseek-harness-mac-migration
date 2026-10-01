/** Update-check settings card registered into Web Settings. */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { UpdateSettingsCard, type DesktopUpdater, type UpdateSettingsCardInjected } from './UpdateSettingsCard.tsx'
import { OfficialUpdateFooterEntry, type OfficialUpdateFooterEntryInjected } from './OfficialUpdateFooterEntry.tsx'
import { en, zh, type UpdateCheckLocaleKey } from './locales.ts'

export type { UpdateSettingsCardInjected, UpdateSettingsCardProps } from './UpdateSettingsCard.tsx'
export type { OfficialUpdateFooterEntryInjected, OfficialUpdateFooterEntryProps } from './OfficialUpdateFooterEntry.tsx'
export type { UpdateCheckLocaleKey } from './locales.ts'

declare global {
  interface Window {
    /** Native download bridge exposed only by the Electron desktop shell. */
    dshDesktopUpdater?: DesktopUpdater
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Update-check copy. */
    'settings.update': UpdateCheckLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.update'

/** Services required by the Settings registration and generated Remote face. */
export const inject = ['slots', 'locale', 'remote', 'remote.updateCheck', 'settingsNavigator']

/** Contribute the update-check card to the Settings General section. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-settings-update: dictionaries')

  ctx.inject(['slots', 'locale', 'remote', 'remote.updateCheck', 'settingsNavigator'], (scope) => {
    const t = scope.locale.bind(NS)
    const check: UpdateSettingsCardInjected['check'] = async () => {
      const result = await scope.remote.updateCheck.check()
      if (!result.ok) {
        throw new Error(`updateCheck.check failed: ${result.error.code}: ${result.error.message}`)
      }
      return result.value
    }
    const sectionInjected = (): UpdateSettingsCardInjected => ({
      check,
      ...(window.dshDesktopUpdater === undefined ? {} : { desktopUpdater: window.dshDesktopUpdater }),
    })
    const footerInjected = (): OfficialUpdateFooterEntryInjected => ({
      openUpdateSettings: () => { scope.settingsNavigator.open('update') },
    })

    scope.slots.inject('settings.section', () => scope.slots.register({
      name: 'settings.section',
      id: 'update',
      order: 500,
      label: () => t('title'),
      locale: NS,
      inject: sectionInjected,
    }, UpdateSettingsCard))
    scope.slots.inject('sidebar.footer.action', () => scope.slots.register({
      name: 'sidebar.footer.action',
      id: 'official-update',
      order: -100,
      locale: NS,
      inject: footerInjected,
    }, OfficialUpdateFooterEntry))
  })
}
