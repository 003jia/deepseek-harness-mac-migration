/** Memory extraction outcomes refer to one preceding logged request. @module */
import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { InvariantFailure, InvariantInstaller } from '@deepseek-ai/dsh-invariants'
import type {} from './types.ts'

/** Companion plugin name. */
export const name = 'host-memory-invariant'
/** Required invariant registry. */
export const inject = ['invariants']

const install: InvariantInstaller = Object.assign((ctx: Context, fail: InvariantFailure) => {
  const pending = new WeakMap<Session, Set<number>>()
  ctx.on('internal/dispatch', (_mode, eventName, args) => {
    if (eventName !== 'session/event') return
    const [session, event] = args as [Session, SessionEvent]
    if (event.type === 'memory/extraction-request') {
      let requests = pending.get(session)
      if (requests === undefined) {
        requests = new Set()
        pending.set(session, requests)
      }
      requests.add(event.seq)
    }
    if (event.type === 'memory/extraction-result') {
      const requests = pending.get(session)
      if (event.data.requestSeq >= event.seq || !requests?.delete(event.data.requestSeq)) {
        fail('memory extraction result must refer to one preceding extraction request')
      }
    }
  }, { global: true })
}, { inject: [] })

/**
 * Register the request/result relationship checker.
 * @param ctx - invariant registry context.
 * @returns disposer after registration.
 */
export const apply = (ctx: Context): Promise<() => void> => Promise.resolve(ctx.invariants.register('@deepseek-ai/dsh-host-memory', install))
