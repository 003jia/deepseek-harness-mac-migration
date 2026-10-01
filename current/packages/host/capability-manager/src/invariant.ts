/** Package-owned invariant companion. @module @deepseek-ai/dsh-host-capability-manager/invariant */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-host-capability-manager'

/** Cordis companion plugin name. */
export const name = 'host-capability-manager-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/** No runtime invariant: settings validation owns persisted entries; this manager has no cross-stream event relationship. */
const install: InvariantInstaller = () => {}

/** Register the package invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
