/** Build an unpacked, unsigned Windows Desktop client from the current workspace. */

import { packageTarget, parseDesktopPackageInvocation } from './package-target.ts'
import { desktopLocalArtifactDirectory } from './desktop-build-paths.mjs'
import { writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const invocation = parseDesktopPackageInvocation(['win-x64', '--dir', '--unsigned'])
const environment: NodeJS.ProcessEnv = {
  ...process.env,
  DSH_DESKTOP_APP_ID: 'com.deepseek.harness.local',
  DSH_DESKTOP_LOCAL_DIRECTORY: '1',
}

console.log('desktop local package: building an unsigned Windows directory; no installer or update feed is produced')
await packageTarget(invocation, environment, undefined)
const resources = join(desktopLocalArtifactDirectory(), 'win-unpacked', 'resources')
await writeFile(join(resources, 'local-source-root.json'), `${JSON.stringify({
  schemaVersion: 1,
  sourceRoot: resolve(import.meta.dirname, '../../..'),
})}\n`)
console.log(`desktop local package: ${join(desktopLocalArtifactDirectory(), 'win-unpacked', 'DeepSeek Harness.exe')}`)
