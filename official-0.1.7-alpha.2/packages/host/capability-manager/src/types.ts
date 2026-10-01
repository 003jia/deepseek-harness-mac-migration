/** User-managed capabilities exposed by the settings manager. @module */
import type { Branded } from '@deepseek-ai/dsh-brand'

/** Persistent identity within the user's managed capabilities. */
export type CapabilityId = Branded<'CapabilityId'>
/** JSON values allowed in user-owned capability configuration. */
export type CapabilityJsonValue = string | number | boolean | null | CapabilityJsonValue[] | { [key: string]: CapabilityJsonValue }
/** One JSON object accepted by a managed capability provider. */
export interface CapabilityConfig { [key: string]: CapabilityJsonValue }
/** The three configurable capability families. */
export type CapabilityKind = 'skill' | 'mcp' | 'subagent'
/** Saved non-secret plugin configuration. */
export interface CapabilityEntry {
  /** Persistent identity within the user's managed capabilities. */
  id: CapabilityId
  /** Kind of Host capability registered by this entry. */
  kind: CapabilityKind
  /** User-facing label shown in Settings. */
  name: string
  /** Whether the manager should mount the capability. */
  enabled: boolean
  /** Provider-specific JSON values; secret values must use credential references. */
  config: CapabilityConfig
}
/** Runtime status kept distinct from the saved enablement flag. */
export interface CapabilityView extends CapabilityEntry {
  status: 'disabled' | 'pending' | 'active' | 'failed'
  error: string | null
}
/** Current management directory. */
export interface CapabilitySnapshot { entries: CapabilityView[] }
