/** Wire values for local user and project memory. @module */
import type { Branded } from '@deepseek-ai/dsh-brand'
import type { Message, TokenUsage } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** Identity derived from a memory's initial scope and normalized content. */
export type MemoryId = Branded<'MemoryId'>

/** A saved fact; an empty workspace denotes an explicitly shared user memory. */
export interface MemoryEntry {
  id: MemoryId
  workspace: string
  content: string
  updatedAt: number
  source: 'manual' | 'automatic'
  sourceSession: SessionId | null
  sourceSeq: number
}

/** Settings and durable memories visible to a trusted local settings client. */
export interface MemorySnapshot {
  enabled: boolean
  autoExtract: boolean
  entries: MemoryEntry[]
  extracting: boolean
  error: string | null
}

/** Exact auxiliary request, recorded before dispatch to the selected model. */
export interface MemoryExtractionRequest {
  provider: string
  model: string
  system: string
  messages: Message[]
  maxTokens: number
  throughSeq: number
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * Log-only exact input for an auxiliary memory extraction.
     * @param data - model route, prompt, source messages, output budget, and source cursor.
     */
    'memory/extraction-request': MemoryExtractionRequest
    /**
     * Log-only outcome and actual provider token usage, when available.
     * @param data - request reference, outcome, saved count, and provider usage.
     */
    'memory/extraction-result': {
      requestSeq: number
      status: 'saved' | 'cancelled' | 'failed'
      count: number
      usage?: TokenUsage
    }
  }
}
