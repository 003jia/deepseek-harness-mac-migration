/** Source-update settings contribution for the current Web client API. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { UpdateSettingsCard, type UpdateSettingsCardInjected } from './UpdateSettingsCard.tsx'
import { en, zh, type UpdateCheckLocaleKey } from './locales.ts'

export type { UpdateSettingsCardInjected, UpdateSettingsCardProps } from './UpdateSettingsCard.tsx'
export type { UpdateCheckLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'settings.update': UpdateCheckLocaleKey
  }
}

const NS = 'settings.update'
export const inject = ['slots', 'locale', 'remote', 'remote.updateCheck']

/** Register the official source-update page. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-settings-update: dictionaries')
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'update',
    order: 500,
    label: () => t('title'),
    locale: NS,
    inject: (): UpdateSettingsCardInjected => ({
      check: async () => {
        const result = await ctx.remote.updateCheck.check()
        if (!result.ok) throw new Error(result.error.message)
        return result.value
      },
      stageSource: async () => {
        const result = await ctx.remote.updateCheck.stageSource()
        if (!result.ok) throw new Error(result.error.message)
        return result.value
      },
    }),
  }, UpdateSettingsCard))
}
