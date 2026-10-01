import type { Branded } from '@deepseek-ai/dsh-brand'

/** Stable identity of one package-management operation. */
export type PackageOperationId = Branded<'PackageOperationId'>

/** Kind of package-management operation. */
export type PackageOperationKind = 'install' | 'update' | 'remove'

/** Point-in-time view of the active profile's plugin state. */
export interface ProfileSnapshot {
  /** Absolute path of the profile directory. */
  readonly profileDir: string
  /** Ordered bundle layer list (`dsh.profile.bundles`). */
  readonly bundles: readonly string[]
  /** Installed dependencies by package name. */
  readonly dependencies: Record<string, string>
}

/** Outcome of one package-management operation. */
export interface PackageOperationResult {
  /** Operation identity for correlation. */
  readonly operationId: PackageOperationId
  /** The package the operation targeted. */
  readonly packageName: string
  /** What the operation did. */
  readonly kind: PackageOperationKind
  /** Whether the operation completed successfully. */
  readonly ok: boolean
  /** Human-readable failure detail, present only when `ok` is false. */
  readonly error?: string
  /** Whether the running dsh must restart for the change to take effect. */
  readonly restartRequired: boolean
}
