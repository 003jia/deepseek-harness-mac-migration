import type { Context } from '@deepseek-ai/cordis'
import { LlmAdapter, ToolCallId, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'

class ErrorDigestMockAdapter extends LlmAdapter {
  private requests = 0

  async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests += 1
    if (this.requests === 1) {
      yield { type: 'block-start', index: 0, blockType: 'tool-call' }
      yield { type: 'block-end', index: 0, block: { type: 'tool-call', id: ToolCallId('failed-call'), name: 'fixture_fail', arguments: '{}' } }
      yield { type: 'finish', reason: { kind: 'tool-calls' } }
      return
    }
    const prompt = options.messages.find(message => message.role === 'system')?.content
      .filter(block => block.type === 'text').map(block => block.text).join('\n') ?? ''
    if (!prompt.includes('## Recent Errors') || !prompt.includes('[fixture_fail]')) {
      throw new Error('error digest missing from the second model request')
    }
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: 'error observed' } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

export const name = 'error-digest-mock-llm'
export const inject = ['llm']

/** Register the deterministic adapter used by the Loader smoke. */
export function apply(ctx: Context): void {
  ctx.llm.registerAdapter(['error-digest-mock'], new ErrorDigestMockAdapter())
}
