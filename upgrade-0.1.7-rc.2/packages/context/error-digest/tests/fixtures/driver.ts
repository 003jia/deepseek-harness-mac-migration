#!/usr/bin/env node
/** Run one failing tool call through the production headless composition. */
import { resolveConfigPath } from '@deepseek-ai/dsh-app-boot'
import { runFixtureTurn } from '@deepseek-ai/dsh-loader-smoke'
import { bootProductionProfile } from '../../../../test-support/loader-smoke/tests/fixtures/production-profile.ts'

const configPath = process.argv[2]
if (configPath === undefined) throw new Error('error-digest driver requires a config path')
const ctx = await bootProductionProfile({
  binName: 'error-digest-e2e',
  profile: 'headless',
  overlayPaths: [resolveConfigPath(configPath, undefined)],
})
try {
  await runFixtureTurn(ctx, { task: 'run the failing fixture tool' })
} finally {
  await ctx.fiber.dispose()
}
