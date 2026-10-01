#!/usr/bin/env node
/** Run the loop budget through the production headless composition. */
import { resolveConfigPath } from '@deepseek-ai/dsh-app-boot'
import { runFixtureTurn } from '@deepseek-ai/dsh-loader-smoke'
import { bootProductionProfile } from '../../../../test-support/loader-smoke/tests/fixtures/production-profile.ts'

const configPath = process.argv[2]
if (configPath === undefined) throw new Error('claude-loop driver requires a config path')
const ctx = await bootProductionProfile({
  binName: 'claude-loop-e2e',
  profile: 'headless',
  overlayPaths: [resolveConfigPath(configPath, undefined)],
})
try {
  const agent = ctx.agents.roots()[0]
  if (agent === undefined) throw new Error('fixture root agent is missing')
  if (ctx.tools.get('snip', agent) === undefined) throw new Error('Claude loop snip tool is missing')
  if (ctx.tools.get('plan_agent', agent) === undefined) throw new Error('Claude loop plan_agent tool is missing')
  await runFixtureTurn(ctx, { task: 'read the fixture value' })
} finally {
  await ctx.fiber.dispose()
}
