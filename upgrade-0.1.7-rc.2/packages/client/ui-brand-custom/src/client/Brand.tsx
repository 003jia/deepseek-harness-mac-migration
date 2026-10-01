import type { HeroBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

type CustomBrandMarkProps = HeroBrandMarkOwnerProps & SidebarBrandMarkOwnerProps

const BRAND_MARK = '嘉言成'
const BRAND_NAME = '嘉言成 harness'

/**
 * Render the custom brand name as the hero mark.
 * @param props - Host-supplied mark presentation.
 * @returns the custom brand name text.
 */
export function CustomBrandMark({ className }: CustomBrandMarkProps) {
  return <span className={className}>{BRAND_MARK}</span>
}

/**
 * Render the custom brand name in the sidebar.
 * @returns the custom brand name text.
 */
export function CustomBrandName() {
  return <span>{BRAND_NAME}</span>
}
