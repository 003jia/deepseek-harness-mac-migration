/** User-managed skill roots, MCP connections and subagent roles. @module */
import { randomUUID } from 'node:crypto'
import { isAbsolute } from 'node:path'
import { realpath, stat } from 'node:fs/promises'
import { Context, FiberState, Service } from '@deepseek-ai/cordis'
import type { Fiber } from '@deepseek-ai/cordis'
import schema from '@deepseek-ai/schemastery'
import { z } from 'zod'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import * as skills from '@deepseek-ai/dsh-skill-filesystem'
import * as mcp from '@deepseek-ai/dsh-mcp-client'
import * as subagent from '@deepseek-ai/dsh-tool-subagent'
import type {} from '@deepseek-ai/dsh-subagent'
import type { CapabilityConfig, CapabilityEntry, CapabilityId, CapabilityKind, CapabilitySnapshot } from './types.ts'

export type * from './types.ts'

/** Saved management configuration, with credentials represented by references. */
export interface Config {
  /** Configured skills, MCP connections, and subagent roles. */
  entries: PersistedCapabilityEntry[]
}

/** Stored capability fields, using plain strings for durable identities. */
export interface PersistedCapabilityEntry extends Omit<CapabilityEntry, 'id'> {
  /** Stable persisted identity for the managed entry. */
  id: string
}

const namespace = settingsNamespace('capabilities')
const input = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/).transform(value => value as CapabilityId),
  kind: z.enum(['skill', 'mcp', 'subagent']), name: z.string().trim().min(1),
  enabled: z.boolean(), config: z.record(z.string(), z.json()),
})

declare module '@deepseek-ai/cordis' {
  interface Context { capabilityManager: CapabilityManager }
}

/** Lifecycle owner for capabilities created explicitly from Settings. */
export class CapabilityManager extends TypertRemoteService {
  static inject = ['settings', 'credentials', 'skills', 'subagents']
  static Config: schema<Config> = schema.object({
    entries: schema.array(schema.object({
      id: schema.string().required(), kind: schema.union(['skill', 'mcp', 'subagent']).required(),
      name: schema.string().required(), enabled: schema.boolean().default(true), config: schema.dict(schema.any()).required(),
    })).default([]),
  })
  private source: () => Config
  private mounted = new Map<CapabilityId, { entry: CapabilityEntry; fiber?: Fiber; error: string | null }>()
  private tail: Promise<unknown> = Promise.resolve()
  private stopped = false
  private ready = false

  /**
   * @param ctx - the Host management context.
   * @param config - persisted management directory.
   */
  constructor(ctx: Context, config: Config) {
    super(ctx, 'capabilityManager')
    this.source = () => config
    installSettingsSection(ctx, namespace, CapabilityManager.Config, config, {
      setSource: (source) => { this.source = source },
      validate: (value) => {
        const entries = z.array(input).parse(value.entries)
        if (new Set(entries.map(entry => entry.id)).size !== entries.length) throw new Error('Capability IDs must be unique.')
      },
      onChange: () => {
        if (this.ready) void this.enqueue(() => this.reconcile()).catch((error: unknown) => {
          this.ctx.logger.error(`Capability reconciliation failed (${error instanceof Error ? error.name : 'unknown error'}).`)
        })
      },
    })
  }

  /** Activate saved capabilities and join their teardown on unload. */
  async* [Service.init](): AsyncGenerator<() => Promise<void>, void, void> {
    this.ready = true
    yield async () => {
      this.stopped = true
      await this.tail
      const disposed = await Promise.allSettled([...this.mounted.values()].map(row => Promise.resolve(row.fiber?.dispose())))
      const failures = disposed.filter(result => result.status === 'rejected')
      if (failures.length > 0) this.ctx.logger.error(`Capability shutdown had ${failures.length} disposal failure(s).`)
      this.mounted.clear()
    }
    await this.reconcile()
  }

  /**
   * Return saved entries with their current activation state.
   * @returns the current capability snapshot.
   */
  @Remote
  snapshot(): CapabilitySnapshot {
    return { entries: this.entries().map((entry) => {
      const current = this.mounted.get(entry.id)
      const waitingForProvider = entry.kind === 'subagent'
        && typeof entry.config.provider === 'string'
        && this.ctx.subagents.getProvider(entry.config.provider) === undefined
      return { ...entry, status: current?.error !== null && current?.error !== undefined ? 'failed' : !entry.enabled ? 'disabled'
        : current?.fiber?.state === FiberState.ACTIVE && !waitingForProvider ? 'active'
          : current?.fiber?.state === FiberState.FAILED ? 'failed' : 'pending',
      error: current?.error ?? (current?.fiber?.state === FiberState.FAILED ? 'Activation failed. Check the configuration and host logs.' : null) }
    }) }
  }

  /** @returns validated saved entries with their branded runtime identities. */
  private entries(): CapabilityEntry[] {
    return this.source().entries.map(entry => input.parse(entry))
  }

  /**
   * Save one validated capability and settle its resulting activation.
   * @param id - existing identity, or null to add.
   * @param kind - capability family.
   * @param name - user-facing name.
   * @param config - family-specific JSON configuration; credentials use references.
   * @param enabled - whether to activate it.
   * @returns the saved directory and actual activation states.
   */
  @Remote
  async save(
    id: CapabilityId | null, kind: CapabilityKind, name: string, config: CapabilityConfig, enabled: boolean,
  ): Promise<CapabilitySnapshot> {
    const entry = input.parse({ id: id ?? randomUUID(), kind, name, config, enabled })
    return this.enqueue(async () => {
      await this.resolve(entry)
      await this.ctx.settings.update(namespace, { entries: [...this.source().entries.filter(item => item.id !== entry.id), entry] })
      await this.reconcile()
      return this.snapshot()
    })
  }

  /**
   * Enable or disable an existing capability without deleting its configuration.
   * @param id - saved identity.
   * @param enabled - target state.
   * @returns actual activation state after reconciliation.
   */
  @Remote
  async toggle(id: CapabilityId, enabled: boolean): Promise<CapabilitySnapshot> {
    return this.enqueue(async () => {
      const entries = this.entries()
      if (!entries.some(entry => entry.id === id)) throw new Error('Capability no longer exists.')
      await this.ctx.settings.update(namespace, { entries: entries.map(entry => entry.id === id ? { ...entry, enabled } : entry) })
      await this.reconcile()
      return this.snapshot()
    })
  }

  /**
   * Disconnect and remove one managed configuration, retaining original skill files.
   * @param id - saved identity.
   * @returns remaining configurations.
   */
  @Remote('removeEntry')
  async remove(id: CapabilityId): Promise<CapabilitySnapshot> {
    return this.enqueue(async () => {
      const entries = this.entries()
      if (!entries.some(entry => entry.id === id)) throw new Error('Capability no longer exists.')
      await this.ctx.settings.update(namespace, { entries: entries.map(entry => entry.id === id ? { ...entry, enabled: false } : entry) })
      await this.reconcile()
      await this.ctx.settings.update(namespace, { entries: this.source().entries.filter(entry => entry.id !== id) })
      await this.reconcile()
      return this.snapshot()
    })
  }

  /**
   * Reload a capability and report its connection or activation result.
   * @param id - saved identity.
   * @returns refreshed status.
   */
  @Remote
  async reconnect(id: CapabilityId): Promise<CapabilitySnapshot> {
    await this.enqueue(async () => {
      if (!this.entries().some(entry => entry.id === id)) throw new Error('Capability no longer exists.')
      await this.mounted.get(id)?.fiber?.dispose()
      this.mounted.delete(id)
      await this.reconcile()
    })
    return this.snapshot()
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(async () => {
      if (this.stopped) throw new Error('Capability manager is stopping.')
      return operation()
    })
    this.tail = result.then(() => undefined, () => undefined)
    return result
  }

  private async resolve(entry: CapabilityEntry): Promise<skills.Config | mcp.Config | subagent.Config> {
    switch (entry.kind) {
      case 'skill': {
        const value = z.object({ directory: z.string().min(1) }).strict().parse(entry.config)
        if (!isAbsolute(value.directory)) throw new Error('Skill directory must be an absolute path.')
        const directory = await realpath(value.directory)
        if (!(await stat(directory)).isDirectory()) throw new Error('Skill source must be a directory.')
        return skills.Config({ providerName: `managed-${entry.id}`, includeDefaultRoots: false, customSkillDirs: [directory] })
      }
      case 'mcp': {
        const value = z.object({
          transport: z.enum(['stdio', 'streamable-http']), command: z.string().optional(), args: z.array(z.string()).optional(),
          cwd: z.string().optional(), url: z.url().optional(),
          toolCallTimeoutMs: z.number().int().positive(),
          envRefs: z.record(z.string(), z.string()).optional(), headerRefs: z.record(z.string(), z.string()).optional(),
        }).strict().parse(entry.config)
        const refs = async (values: Record<string, string> | undefined) => {
          const resolved: Record<string, string> = {}
          for (const [key, ref] of Object.entries(values ?? {})) {
            const credential = await this.ctx.credentials.resolve(credentialRef(ref))
            if (credential === undefined) throw new Error(`Credential reference is not configured: ${ref}`)
            resolved[key] = credential.value
          }
          return resolved
        }
        const serverName = `m-${entry.id.replaceAll('-', '').slice(0, 24)}`
        if (value.transport === 'stdio') {
          if (value.command === undefined || value.url !== undefined || value.headerRefs !== undefined) {
            throw new Error('A stdio MCP configuration needs a command and cannot include an HTTP URL or headers.')
          }
          return mcp.Config({ transport: 'stdio', serverName, command: value.command, args: value.args ?? [],
            cwd: value.cwd ?? '', env: await refs(value.envRefs), toolCallTimeoutMs: value.toolCallTimeoutMs, failOnStartupError: true })
        }
        if (
          value.url === undefined || value.command !== undefined || value.args !== undefined
          || value.cwd !== undefined || value.envRefs !== undefined
        ) {
          throw new Error('A Streamable HTTP MCP configuration needs a URL and cannot include stdio fields.')
        }
        const url = new URL(value.url)
        if (url.username !== '' || url.password !== '') throw new Error('MCP URLs must use credential references instead of embedded credentials.')
        if ([...url.searchParams.keys()].some(key => /(?:api[_-]?key|auth|password|secret|token)/i.test(key))) {
          throw new Error('MCP URL query parameters must not contain credentials; use header references instead.')
        }
        return mcp.Config({ transport: 'streamable-http', serverName, url: value.url,
          headers: await refs(value.headerRefs), toolCallTimeoutMs: value.toolCallTimeoutMs, failOnStartupError: true })
      }
      case 'subagent': {
        const value = z.object({
          provider: z.string().min(1), persona: z.string().optional(),
          agentOptions: z.object({
            provider: z.string().optional(), model: z.string().optional(), maxTokens: z.number().int().positive().optional(),
          }).optional(),
          toolFilter: z.object({ allow: z.array(z.string()).optional(), deny: z.array(z.string()).optional() }).optional(),
          maxDepth: z.union([z.number().int().nonnegative(), z.literal('provider-managed')]).optional(),
        }).strict().parse(entry.config)
        const agentOptions = value.agentOptions === undefined ? undefined : {
          ...(value.agentOptions.provider === undefined ? {} : { provider: value.agentOptions.provider }),
          ...(value.agentOptions.model === undefined ? {} : { model: value.agentOptions.model }),
          ...(value.agentOptions.maxTokens === undefined ? {} : { maxTokens: value.agentOptions.maxTokens }),
        }
        const toolFilter = value.toolFilter === undefined ? undefined : {
          ...(value.toolFilter.allow === undefined ? {} : { allow: value.toolFilter.allow }),
          ...(value.toolFilter.deny === undefined ? {} : { deny: value.toolFilter.deny }),
        }
        return subagent.Config({ provider: value.provider, toolName: `agent_${entry.id.replaceAll('-', '_')}`,
          enableRunInBackground: true, backgroundMode: 'one-shot',
          ...(value.persona === undefined ? {} : { persona: value.persona }),
          ...(agentOptions === undefined ? {} : { agentOptions }),
          ...(toolFilter === undefined ? {} : { toolFilter }),
          ...(value.maxDepth === undefined ? {} : { maxDepth: value.maxDepth }) })
      }
    }
  }

  private async reconcile(): Promise<void> {
    const entries = this.entries()
    for (const [id, current] of this.mounted) {
      const next = entries.find(entry => entry.id === id)
      if (next !== undefined && JSON.stringify(next) === JSON.stringify(current.entry)) continue
      try {
        await current.fiber?.dispose()
      } catch (error) {
        current.error = 'The previous activation could not be stopped. Check the configuration and host logs.'
        this.ctx.logger.warn(`Capability "${current.entry.name}" failed to stop (${error instanceof Error ? error.name : 'unknown error'}).`)
        throw new Error(current.error)
      }
      this.mounted.delete(id)
    }
    for (const entry of entries) {
      if (!entry.enabled || this.mounted.has(entry.id)) continue
      const row: { entry: CapabilityEntry; fiber?: Fiber; error: string | null } = { entry, error: null }
      this.mounted.set(entry.id, row)
      try {
        const config = await this.resolve(entry)
        switch (entry.kind) {
          case 'skill': row.fiber = this.ctx.plugin(skills, config as skills.Config); break
          case 'mcp': row.fiber = this.ctx.plugin(mcp, config as mcp.Config); break
          case 'subagent': row.fiber = this.ctx.plugin(subagent, config as subagent.Config); break
        }
      } catch (error) {
        row.error = 'Activation failed. Check the configuration and host logs.'
        this.ctx.logger.warn(`Capability "${entry.name}" failed to activate (${error instanceof Error ? error.name : 'unknown error'}).`)
        try {
          await row.fiber?.dispose()
        } catch (disposeError) {
          this.ctx.logger.warn(`Capability "${entry.name}" cleanup failed (${disposeError instanceof Error ? disposeError.name : 'unknown error'}).`)
        }
        delete row.fiber
      }
    }
  }
}

export default CapabilityManager
