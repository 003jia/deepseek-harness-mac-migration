/** Package-owned invariant companion. @module @deepseek-ai/dsh-host-extensions-registry/invariant */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-host-extensions-registry'

/** Cordis companion plugin name. */
export const name = 'host-extensions-registry-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/** No runtime invariant: the registry remote service has no internal event/data relation
 * worth asserting at startup; its correctness is verified through the inventory integration test. */
const install: InvariantInstaller = () => {}

/** Register this package's invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
