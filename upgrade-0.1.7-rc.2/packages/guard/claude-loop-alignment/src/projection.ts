/** Durable turn accounting for Claude-style loop controls. @module */
import type { Context } from '@deepseek-ai/cordis'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session-projection'
import { z } from 'zod'

/** Facts needed by the loop hooks after a session resumes. */
export interface ClaudeLoopState {
  turn: number
  toolSteps: number
  lastToolStep: number
  outputTokens: number
  lastFinishKind: string | null
  userSeqs: number[]
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    /** Tool steps, output usage, and final model finish in the current turn. */
    claudeLoop: ClaudeLoopState
  }
}

const stateSchema: z.ZodType<ClaudeLoopState> = z.object({
  turn: z.number(),
  toolSteps: z.number(),
  lastToolStep: z.number(),
  outputTokens: z.number(),
  lastFinishKind: z.string().nullable(),
  userSeqs: z.array(z.number()),
})

/** Read the final finish reason from one compacted assistant stream. */
function finishKind(stream: SessionEvent<'assistant/message' | 'assistant/attempt'>['data']['stream']): string | null {
  for (let index = stream.length - 1; index >= 0; index--) {
    const record = stream[index]
    if (record?.type === 'chunk' && record.chunk.type === 'finish') return record.chunk.reason.kind
  }
  return null
}

/**
 * Fold one committed event without reading the deprecated session event array.
 * @param state - previous session projection state.
 * @param event - newly committed event.
 * @returns updated turn facts.
 */
export function applyClaudeLoopEvent(state: ClaudeLoopState, event: SessionEvent): ClaudeLoopState {
  if (event.type === 'turn/start') {
    return { ...state, turn: event.data.turn, toolSteps: 0, lastToolStep: -1, outputTokens: 0, lastFinishKind: null }
  }
  if (event.type === 'user/message') return { ...state, userSeqs: [...state.userSeqs, event.seq] }
  if (event.type === 'tool/call' && event.data.turn === state.turn && event.data.step !== state.lastToolStep) {
    return { ...state, toolSteps: state.toolSteps + 1, lastToolStep: event.data.step }
  }
  if (event.type === 'assistant/message' && event.data.turn === state.turn) {
    return {
      ...state,
      outputTokens: state.outputTokens + (event.data.usage?.outputTokens ?? 0),
      lastFinishKind: finishKind(event.data.stream),
    }
  }
  if (event.type === 'assistant/attempt' && event.data.turn === state.turn) {
    return { ...state, lastFinishKind: finishKind(event.data.stream) }
  }
  return state
}

/**
 * Register the host-only turn projection.
 * @param ctx - plugin context owning the projection registration.
 */
export function registerClaudeLoopProjection(ctx: Context): void {
  ctx.sessionProjections.register({
    key: 'claudeLoop', stateVersion: 1, stateSchema,
    init: () => ({ turn: -1, toolSteps: 0, lastToolStep: -1, outputTokens: 0, lastFinishKind: null, userSeqs: [] }),
    apply: applyClaudeLoopEvent,
  })
}
