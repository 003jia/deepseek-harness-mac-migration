import type { Context } from '@deepseek-ai/cordis'
import { LlmAdapter, ToolCallId, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'

class ClaudeLoopMockAdapter extends LlmAdapter {
  private requests = 0

  async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests++
    if (this.requests === 1) {
      yield { type: 'block-start', index: 0, blockType: 'tool-call' }
      yield { type: 'block-end', index: 0, block: { type: 'tool-call', id: ToolCallId('loop-call'), name: 'fixture_read', arguments: '{}' } }
      yield { type: 'finish', reason: { kind: 'tool-calls' } }
      return
    }
    const text = options.messages.flatMap(message => message.content)
      .filter(block => block.type === 'text').map(block => block.text).join('\n')
    if (!text.includes('[turn budget]') || !text.includes('Do not call any more tools')) {
      throw new Error('Claude loop stop instruction missing from second request')
    }
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: 'Finished after one tool step.' } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

export const name = 'claude-loop-mock-llm'
export const inject = ['llm']

/** Register the deterministic adapter used by the assembled loop snapshot. */
export function apply(ctx: Context): void {
  ctx.llm.registerAdapter(['claude-loop-mock'], new ClaudeLoopMockAdapter())
}
