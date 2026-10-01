import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readLocalSourceRoot } from '../src/local-source-root.ts'

describe('local Desktop source checkout record', () => {
  it('uses a recorded absolute checkout and leaves release builds without one', () => {
    const resources = mkdtempSync(join(tmpdir(), 'dsh-desktop-source-'))
    try {
      expect(readLocalSourceRoot(resources)).toBeUndefined()
      const sourceRoot = join(resources, 'source')
      writeFileSync(join(resources, 'local-source-root.json'), JSON.stringify({ schemaVersion: 1, sourceRoot }))
      expect(readLocalSourceRoot(resources)).toBe(sourceRoot)
      writeFileSync(join(resources, 'local-source-root.json'), JSON.stringify({ schemaVersion: 1, sourceRoot: 'relative' }))
      expect(() => readLocalSourceRoot(resources)).toThrow('invalid checkout record')
    } finally {
      rmSync(resources, { recursive: true, force: true })
    }
  })
})
