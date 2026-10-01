import type { Context } from '@deepseek-ai/cordis'
import { defineContentToolFixture } from '@deepseek-ai/dsh-tools'

export const name = 'error-digest-mock-tool'
export const inject = ['tools']

/** Register one failing tool through the real ToolRuntime. */
export function apply(ctx: Context): void {
  ctx.tools.register(defineContentToolFixture({
    name: 'fixture_fail',
    description: 'Fail in the error digest fixture',
    parameters: {},
    execute: async () => { throw new Error('fixture failure') },
  }))
}
