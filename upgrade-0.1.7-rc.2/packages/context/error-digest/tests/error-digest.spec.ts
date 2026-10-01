import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { applyErrorEvent, renderErrorDigest } from '../src/index.ts'

describe('error digest', () => {
  it('retains bounded distinct errors in projected session state after result replacement', () => {
    const events = [
      { type: 'tool/call', data: { callId: 'one', name: 'bash' } },
      { type: 'tool/result', data: { message: { toolCallId: 'one', isError: true, content: [{ type: 'text', text: 'older failure' }] } } },
      { type: 'tool/result', data: { message: { toolCallId: 'one', isError: false, content: [{ type: 'text', text: 'recovered' }] } } },
      { type: 'tool/call', data: { callId: 'two', name: 'read' } },
      { type: 'tool/result', data: { message: { toolCallId: 'two', isError: true, content: [{ type: 'text', text: 'missing\nfile ' + 'x'.repeat(500) }] } } },
    ] as SessionEvent[]
    let state = { pending: {}, errors: [] as { callId: string; line: string }[] }
    for (const event of events) state = applyErrorEvent(state, event)
    const rendered = renderErrorDigest(state, 1, 40)
    expect(rendered).toContain('1. [read] missing file')
    expect(rendered).not.toContain('older failure')
    expect(rendered.split('\n').at(-1)?.length).toBeLessThanOrEqual(40)
    expect(renderErrorDigest({ pending: {}, errors: [] }, 10, 200)).toBe('')
  })
})
