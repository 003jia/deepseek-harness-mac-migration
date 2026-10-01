import { IconDownloadOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './locales.ts'
import css from './OfficialUpdateFooterEntry.module.css'

/** Sidebar action dependency owned by the update package. */
export interface OfficialUpdateFooterEntryInjected {
  /** Open the official update section in Settings. */
  openUpdateSettings: () => void
}

/** Full component props supplied by the sidebar footer slot. */
export type OfficialUpdateFooterEntryProps =
  PropsRuntime<'sidebar.footer.action'>
  & PropsLocale<'settings.update'>
  & InjectFace<OfficialUpdateFooterEntryInjected>

/** Render the official update action beside the retained remote-access control. */
export function OfficialUpdateFooterEntry({ openUpdateSettings, t }: OfficialUpdateFooterEntryProps) {
  return (
    <button
      type="button"
      className={css.entry}
      data-official-update-entry
      aria-label={t('sidebarAction')}
      onClick={openUpdateSettings}
    >
      <IconDownloadOutline16 size={20} />
    </button>
  )
}
