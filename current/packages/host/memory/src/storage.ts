/** Durable memory records and extraction cursors over the configured domain backend. @module */
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { defineDomain } from '@deepseek-ai/dsh-storage-domain'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { MemoryEntry, MemoryId } from './types.ts'

const entry = z.object({
  id: z.string().transform(value => value as MemoryId),
  workspace: z.string(), content: z.string(), updatedAt: z.number(),
  source: z.enum(['manual', 'automatic']), sourceSession: z.string().transform(value => value as SessionId).nullable(), sourceSeq: z.number().int(),
}) satisfies z.ZodType<MemoryEntry>

/** Local memory state; cursors and facts commit in the same durable write. */
const initialMemoryState: { entries: MemoryEntry[]; cursors: Record<string, number>; deleted: string[] } = {
  entries: [], cursors: {}, deleted: [],
}

export const memoryDomain = defineDomain({
  name: 'memory', version: 1, tables: {},
  global: {
    schema: z.object({
      entries: z.array(entry),
      cursors: z.record(z.string(), z.number().int()),
      deleted: z.array(z.string()),
    }),
    initial: initialMemoryState,
  },
})

/**
 * Derive a stable content identity for duplicate and deletion suppression.
 * @param workspace - project path, or an empty string for shared memory.
 * @param content - saved fact.
 * @returns branded digest independent of capitalization and whitespace.
 */
export function memoryId(workspace: string, content: string): MemoryId {
  return createHash('sha256').update(JSON.stringify([workspace, content.trim().replace(/\s+/g, ' ').toLowerCase()])).digest('hex') as MemoryId
}

/**
 * Detect common credential payloads before they enter saved memory.
 * @param content - candidate fact.
 * @returns whether the candidate contains a credential marker or private key.
 */
export function containsCredential(content: string): boolean {
  const privateKey = /-----BEGIN .*PRIVATE KEY-----/.test(content)
  const token = /\b(?:sk-|ghp_|github_pat_|xox[baprs]-)[-A-Za-z0-9_]{12,}/.test(content)
  const marker = /(?:api[_ -]?key|password|access[_ -]?token|密码|密钥|验证码)\s*[:：=]/i.test(content)
  return privateKey || token || marker
}
