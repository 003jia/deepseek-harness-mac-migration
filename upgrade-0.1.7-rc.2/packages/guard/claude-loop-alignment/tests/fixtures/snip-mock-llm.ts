import type { Context } from '@deepseek-ai/cordis'
import { LlmAdapter, ToolCallId, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'

class SnipMockAdapter extends LlmAdapter {
  private requests = 0

  async * stream(_options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests++
    if (this.requests === 2) {
      yield { type: 'block-start', index: 0, blockType: 'tool-call' }
      yield { type: 'block-end', index: 0, block: { type: 'tool-call', id: ToolCallId('snip-call'), name: 'snip', arguments: '{"keep_recent":1,"reason":"old task complete"}' } }
      yield { type: 'finish', reason: { kind: 'tool-calls' } }
      return
    }
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: this.requests === 1 ? 'Seeded.' : 'Trimmed.' } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

export const name = 'claude-loop-snip-mock-llm'
export const inject = ['llm']

/** Register the deterministic adapter for the snip surface replacement. */
export function apply(ctx: Context): void {
  ctx.llm.registerAdapter(['claude-loop-snip-mock'], new SnipMockAdapter())
}
