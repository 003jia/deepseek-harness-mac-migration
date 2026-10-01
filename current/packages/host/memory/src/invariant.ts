/** Memory extraction outcomes refer to one preceding logged request. @module */
import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { InvariantFailure, InvariantInstaller } from '@deepseek-ai/dsh-invariants'
import type {} from './types.ts'

/** Companion plugin name. */
export const name = 'host-memory-invariant'
/** Required invariant registry. */
export const inject = ['invariants']

function validate(session: Session, event: SessionEvent, fail: InvariantFailure): void {
  if (event.type !== 'memory/extraction-result') return
  const request = session.events.find(item => item.seq === event.data.requestSeq)
  if (request?.type !== 'memory/extraction-request' || request.seq >= event.seq) {
    fail('memory extraction result must refer to a preceding extraction request')
  }
  if (session.events.some(item => item.seq < event.seq && item.type === 'memory/extraction-result' && item.data.requestSeq === event.data.requestSeq)) {
    fail('memory extraction request must have at most one result')
  }
}

const install: InvariantInstaller = Object.assign((ctx: Context, fail: InvariantFailure) => {
  for (const session of ctx.sessions.list()) for (const event of session.events) validate(session, event, fail)
  ctx.on('internal/dispatch', (_mode, eventName, args) => {
    if (eventName !== 'session/event') return
    const [session, event] = args as [Session, SessionEvent]
    validate(session, event, fail)
  }, { global: true })
}, { inject: ['sessions'] })

/**
 * Register the request/result relationship checker.
 * @param ctx - invariant registry context.
 * @returns disposer after registration.
 */
export const apply = (ctx: Context): Promise<() => void> => Promise.resolve(ctx.invariants.register('@deepseek-ai/dsh-host-memory', install))
