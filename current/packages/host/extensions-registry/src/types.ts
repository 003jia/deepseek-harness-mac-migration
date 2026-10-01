import type { Branded } from '@deepseek-ai/dsh-brand'

/** Stable identity of one npm package name. */
export type NpmPackageName = Branded<'NpmPackageName'>

/** One result from an npm registry search. */
export interface ExtensionSearchResult {
  /** npm package name (e.g. `@deepseek-ai/dsh-bundle-xxx`). */
  readonly name: NpmPackageName
  /** Latest version string. */
  readonly version: string
  /** Package description from npm metadata. */
  readonly description: string
  /** Keywords from npm metadata. */
  readonly keywords: readonly string[]
  /** Whether this package is installed in the current profile. */
  readonly installed: boolean
  /** Installed version, or undefined when not installed. */
  readonly installedVersion?: string
}

/** Aggregated search response from the extensions registry. */
export interface ExtensionsSearchResponse {
  /** Matching packages in relevance order. */
  readonly results: readonly ExtensionSearchResult[]
  /** Total number of results available on the registry (may exceed returned count). */
  readonly total: number
  /** The search query that produced these results. */
  readonly query: string
}
