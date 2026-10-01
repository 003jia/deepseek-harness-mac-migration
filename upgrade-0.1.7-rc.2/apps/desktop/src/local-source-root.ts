/** Source checkout associated with an unpacked local Desktop build. */
import { readFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'

/**
 * Read the optional source checkout recorded beside a local Desktop executable.
 * @param resources - Electron's resources directory.
 * @returns The checkout path, or undefined for a release build.
 */
export function readLocalSourceRoot(resources: string): string | undefined {
  let text: string
  try {
    text = readFileSync(join(resources, 'local-source-root.json'), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
  const record: unknown = JSON.parse(text)
  if (record === null || typeof record !== 'object'
    || !('schemaVersion' in record) || record.schemaVersion !== 1
    || !('sourceRoot' in record) || typeof record.sourceRoot !== 'string'
    || !isAbsolute(record.sourceRoot)) {
    throw new Error('desktop local source: invalid checkout record')
  }
  return record.sourceRoot
}
