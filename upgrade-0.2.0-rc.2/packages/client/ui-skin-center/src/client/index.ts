/**
 * Skin center plugin, browser half. It binds the shared Host settings form,
 * constructs the controller that projects the section onto the DOM (glass
 * CSS variables plus the background layer), injects the background-layer
 * stylesheet, and registers the Skin center page into the settings shell.
 * Export discipline: packages/client/AGENTS.md.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the shell's SlotMap merge (the 'settings.section' entry).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { SkinCenterController, ensureSkinStyleTag } from './controller.ts'
import { SkinCenterSection } from './SkinCenterSection.tsx'
import type { SkinCenterSectionInjected } from './SkinCenterSection.tsx'
import { en, zh, type SkinCenterKey } from './locales.ts'
import { SKIN_CENTER_SETTINGS_NAMESPACE, type SkinCenterSettings } from '../skin-settings.ts'

export type { SkinCenterSectionInjected, SkinCenterSectionProps } from './SkinCenterSection.tsx'
export type { SkinCenterKey } from './locales.ts'
export type { SkinCenterSettings } from '../skin-settings.ts'
export { SkinCenterController, ensureSkinStyleTag } from './controller.ts'

/** Dictionary namespace owned by this plugin. */
export const SETTINGS_NS = 'settings.skin-center'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Skin center page's copy. */
    'settings.skin-center': SkinCenterKey
  }
}

/**
 * Required services: slots, locale, and the shared settings form.
 */
export const inject = ['slots', 'locale', 'configForms']

/**
 * Register the Skin center section once the `settings.section` declaration
 * is on the ledger, and keep the DOM projection current from plugin start.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(SETTINGS_NS, { zh, en }), 'ui-skin-center: copy dictionaries')

  const host = ctx.configForms.get<SkinCenterSettings>(SKIN_CENTER_SETTINGS_NAMESPACE)
  const controller = new SkinCenterController(host)
  ensureSkinStyleTag()
  controller.apply()

  const t = ctx.locale.bind(SETTINGS_NS) as SkinCenterSectionInjected['t']
  const injected = (): SkinCenterSectionInjected => ({ controller, t })
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'skin-center',
    order: 30,
    label: () => t('nav'),
    inject: injected,
  }, SkinCenterSection))
}
