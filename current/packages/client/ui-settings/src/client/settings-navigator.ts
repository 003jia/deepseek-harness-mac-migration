/** Cross-surface requests to show one Settings section. */

import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import { createSnapshotStore, type ObservableSnapshot, type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

/** One one-shot request to open a named Settings section. */
export interface SettingsNavigationRequest {
  /** Monotonic request identifier so the shell can acknowledge exactly once. */
  readonly sequence: number
  /** Registered `settings.section` id selected by the caller. */
  readonly sectionId: string
}

/** Settings-shell navigation face available to feature plugins. */
export interface SettingsNavigator {
  /** Latest unacknowledged open request, if any. */
  readonly requests: ObservableSnapshot<SettingsNavigationRequest | undefined>
  /** Request that the Settings dialog open on one registered section. */
  open(sectionId: string): void
  /** Retire the request after the Settings shell has applied it. */
  acknowledge(sequence: number): void
}

/** Mutable state held behind one service field for Cordis caller tracking. */
interface LiveState {
  /** Sequence source for requests created by this browser root. */
  sequence: number
  /** Observable one-slot request queue. */
  readonly requests: SnapshotStore<SettingsNavigationRequest | undefined>
}

/** Root service coordinating Settings navigation without presentation imports. */
export class SettingsNavigatorService extends Service implements SettingsNavigator {
  private readonly live: LiveState = {
    sequence: 0,
    requests: createSnapshotStore<SettingsNavigationRequest | undefined>(undefined),
  }

  /** @param ctx - owning browser-root context. */
  constructor(ctx: Context) {
    super(ctx, 'settingsNavigator')
  }

  get requests(): ObservableSnapshot<SettingsNavigationRequest | undefined> {
    return this.live.requests
  }

  /** @param sectionId - registered Settings section id to show. */
  open(sectionId: string): void {
    const { live } = this
    live.sequence += 1
    live.requests.set({ sequence: live.sequence, sectionId })
  }

  /** @param sequence - request identifier already consumed by the shell. */
  acknowledge(sequence: number): void {
    const { requests } = this.live
    if (requests.getSnapshot()?.sequence === sequence) requests.set(undefined)
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** The interface-only navigation face; implementation remains package-private. */
    settingsNavigator: import('./settings-navigator.ts').SettingsNavigator
  }
}
