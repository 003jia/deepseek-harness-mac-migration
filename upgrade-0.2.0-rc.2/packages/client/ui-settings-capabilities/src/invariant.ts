/** Package-owned invariant companion. @module @deepseek-ai/dsh-client-ui-settings-capabilities/invariant */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-settings-capabilities'

/** Cordis companion plugin name. */
export const name = 'client-ui-settings-capabilities-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/** No runtime invariant: the page is a settings client; durable capability relationships belong to its Host manager. */
const install: InvariantInstaller = () => {}

/** Register the package invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
