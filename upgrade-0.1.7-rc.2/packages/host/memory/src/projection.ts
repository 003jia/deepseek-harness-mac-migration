/** Durable input and request cursors for local memory extraction. @module */
import type { Context } from '@deepseek-ai/cordis'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { z } from 'zod'
import type {} from '@deepseek-ai/dsh-session-projection'
import type {} from './types.ts'

/** User input still eligible for extraction after the last saved result. */
export interface MemoryInput {
  seq: number
  text: string
}

/** State folded from committed session events. */
export interface MemoryProjectionState {
  latestTurnStartSeq: number
  messages: MemoryInput[]
  requests: { seq: number; throughSeq: number }[]
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    /** Unprocessed user input and pending extraction request positions. */
    memoryExtraction: MemoryProjectionState
  }
}

const stateSchema: z.ZodType<MemoryProjectionState> = z.object({
  latestTurnStartSeq: z.number(),
  messages: z.array(z.object({ seq: z.number(), text: z.string() })),
  requests: z.array(z.object({ seq: z.number(), throughSeq: z.number() })),
})

/**
 * Fold one committed event into memory's extraction input state.
 * @param state - previous projection state.
 * @param event - newly committed session event.
 * @returns updated state, or the same value for unrelated events.
 */
export function applyMemoryEvent(state: MemoryProjectionState, event: SessionEvent): MemoryProjectionState {
  switch (event.type) {
    case 'turn/start':
      return { ...state, latestTurnStartSeq: event.seq }
    case 'user/message': {
      if (event.data.source.kind !== 'user') return state
      const text = event.data.content.filter(block => block.type === 'text').map(block => block.text).join('\n')
      return { ...state, messages: [...state.messages, { seq: event.seq, text }] }
    }
    case 'memory/extraction-request':
      return { ...state, requests: [...state.requests, { seq: event.seq, throughSeq: event.data.throughSeq }] }
    case 'memory/extraction-result': {
      const request = state.requests.find(item => item.seq === event.data.requestSeq)
      if (request === undefined) return state
      return {
        ...state,
        requests: state.requests.filter(item => item.seq !== event.data.requestSeq),
        messages: event.data.status === 'saved'
          ? state.messages.filter(item => item.seq > request.throughSeq)
          : state.messages,
      }
    }
    default:
      // Other extensible session events do not change memory extraction input.
      return state
  }
}

/**
 * Register the Host-only memory input projection.
 * @param ctx - Host context with the session projection service.
 */
export function registerMemoryProjection(ctx: Context): void {
  ctx.sessionProjections.register({
    key: 'memoryExtraction',
    stateVersion: 1,
    stateSchema,
    init: () => ({ latestTurnStartSeq: -1, messages: [], requests: [] }),
    apply: applyMemoryEvent,
  })
}
