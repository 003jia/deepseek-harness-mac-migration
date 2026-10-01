/**
 * Error-digest plugin: monitors tool errors and injects a compact summary
 * into the model's context to prevent error loss across compaction rounds.
 * @module @deepseek-ai/dsh-error-digest
 */

import type { Context } from '@deepseek-ai/cordis'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-system-prompt'

/** Maximum number of recent errors retained in the digest. */
const MAX_DIGEST_SIZE = 10

/** Maximum character length for each error summary line. */
const MAX_LINE_LENGTH = 200

interface DigestEntry {
  readonly timestamp: number
  readonly toolName: string
  readonly errorSummary: string
}

/**
 * Compact a tool error into a single-line summary suitable for context injection.
 */
function compactError(toolName: string, content: unknown): string {
  const text = (typeof content === 'string' ? content : JSON.stringify(content))
    .replace(/\n/g, ' ').slice(0, MAX_LINE_LENGTH)
  return `[${toolName}] ${text}`
}

/** Register the error-digest plugin. */
export const name = 'error-digest'

/** Required services. The session/event stream is subscribed via ctx.on, which
 * does not require injecting the `sessions` service; only systemPrompt is needed.
 */
export const inject = ['systemPrompt']

/**
 * Plugin configuration.
 */
export interface ErrorDigestConfig {
  /** Maximum number of errors to retain. Default: 10. */
  maxDigestSize?: number
}

/**
 * Create the error-digest plugin.
 * @param config - Plugin configuration.
 */
export function apply(ctx: Context, config: ErrorDigestConfig = {}): void {
  const maxSize = config.maxDigestSize ?? MAX_DIGEST_SIZE
  const recentErrors: DigestEntry[] = []

  // Listen for session events — tool/result events carry error information
  ctx.on('session/event', (_session, event: SessionEvent) => {
    if (event.type !== 'tool/result') return

    const result = event.data.message.content[0]
    if (!result.isError) return

    const toolName = 'tool'
    const errorContent = result.content[0]
    const summary = compactError(toolName, errorContent)

    recentErrors.push({
      timestamp: Date.now(),
      toolName,
      errorSummary: summary,
    })

    // Keep bounded
    while (recentErrors.length > maxSize) {
      recentErrors.shift()
    }
  })

  // Register a system prompt section that includes the error digest
  ctx.systemPrompt.section({
    name: 'error-digest',
    order: 900,
    text: () => {
      if (recentErrors.length === 0) return ''
      const lines = recentErrors.map((e, i) =>
        `${i + 1}. ${e.errorSummary}`,
      )
      return [
        '## Recent Errors',
        'The following tool errors occurred in this session. If output was truncated,',
        'read the spill file path reported in the truncated result before proceeding.',
        '',
        ...lines,
      ].join('\n')
    },
  })
}
