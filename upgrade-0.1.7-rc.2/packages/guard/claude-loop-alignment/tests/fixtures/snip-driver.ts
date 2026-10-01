#!/usr/bin/env node
/** Run two turns in one session to exercise model-requested history snipping. */
import { resolveConfigPath } from '@deepseek-ai/dsh-app-boot'
import { runFixtureTurn } from '@deepseek-ai/dsh-loader-smoke'
import { bootProductionProfile } from '../../../../test-support/loader-smoke/tests/fixtures/production-profile.ts'

const configPath = process.argv[2]
if (configPath === undefined) throw new Error('snip driver requires a config path')
const ctx = await bootProductionProfile({
  binName: 'claude-loop-snip-e2e',
  profile: 'headless',
  overlayPaths: [resolveConfigPath(configPath, undefined)],
})
try {
  await runFixtureTurn(ctx, { task: 'seed history' })
  await runFixtureTurn(ctx, { task: 'trim history' })
} finally {
  await ctx.fiber.dispose()
}
