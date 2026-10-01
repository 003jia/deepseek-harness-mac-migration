import type { Context } from '@deepseek-ai/cordis'
import { defineContentToolFixture } from '@deepseek-ai/dsh-tools'

export const name = 'claude-loop-mock-tool'
export const inject = ['tools']

/** Register one deterministic read tool through the real tool runtime. */
export function apply(ctx: Context): void {
  ctx.tools.register(defineContentToolFixture({
    name: 'fixture_read',
    description: 'Read the fixture value',
    parameters: {},
    execute: async () => [{ type: 'text', text: 'fixture value' }],
  }))
}
