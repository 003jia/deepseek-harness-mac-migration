import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { applyMemoryEvent, type MemoryProjectionState } from '../src/projection.ts'

function fold(events: SessionEvent[]): MemoryProjectionState {
  return events.reduce(applyMemoryEvent, { latestTurnStartSeq: -1, messages: [], requests: [] })
}

describe('memory extraction projection', () => {
  it('keeps failed input and removes only messages saved by a completed request', () => {
    const state = fold([
      { type: 'turn/start', seq: 1, data: { turn: 1 } },
      { type: 'user/message', seq: 2, data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'first' }] } },
      { type: 'memory/extraction-request', seq: 3, data: { throughSeq: 2 } },
      { type: 'memory/extraction-result', seq: 4, data: { requestSeq: 3, status: 'failed' } },
      { type: 'turn/start', seq: 5, data: { turn: 2 } },
      { type: 'user/message', seq: 6, data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'second' }] } },
      { type: 'memory/extraction-request', seq: 7, data: { throughSeq: 2 } },
      { type: 'memory/extraction-result', seq: 8, data: { requestSeq: 7, status: 'saved' } },
    ] as SessionEvent[])
    expect(state.latestTurnStartSeq).toBe(5)
    expect(state.requests).toEqual([])
    expect(state.messages).toEqual([{ seq: 6, text: 'second' }])
  })
})
