/**
 * Remote service for the extensions registry: npm-based catalog search and
 * installed-state projection for the current profile.
 * @module @deepseek-ai/dsh-host-extensions-registry
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-profile-manager'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
// Typert-generated ./typert and ./remote artifacts import Zod at runtime.
import type {} from 'zod'
import type {
  ExtensionSearchResult,
  ExtensionsSearchResponse,
  NpmPackageName,
} from './types.ts'

export type * from './types.ts'

/** Default npm registry search endpoint. */
const NPM_SEARCH_URL = 'https://registry.npmjs.org/-/v1/search'

/** Default keyword used to filter dsh bundle packages in npm search. */
const DEFAULT_SEARCH_KEYWORD = 'dsh-bundle'

function npmPackageName(value: string): NpmPackageName {
  return value as NpmPackageName
}

interface NpmSearchObject {
  readonly package: {
    readonly name: string
    readonly version: string
    readonly description?: string
    readonly keywords?: readonly string[]
  }
}

interface NpmSearchResponse {
  readonly objects: readonly NpmSearchObject[]
  readonly total: number
}

/** Remote-only service exposing the extensions registry catalog. */
export class ExtensionsRegistryGateway extends TypertRemoteService {
  static inject = ['profileManager']

  constructor(ctx: Context) {
    super(ctx, 'extensionsRegistry')
  }

  /**
   * Search the npm registry for dsh bundle packages matching a query.
   * Results are filtered by the configured keyword (default: `dsh-bundle`),
   * and joined with the active profile's installed dependencies.
   * @param query - free-text search term.
   * @returns Matching packages in relevance order with installed-state flags.
   */
  @Remote('search')
  async search(query: string): Promise<ExtensionsSearchResponse> {
    const params = new URLSearchParams({
      text: `${query} ${DEFAULT_SEARCH_KEYWORD}`,
      size: '25',
    })
    const response = await fetch(`${NPM_SEARCH_URL}?${params.toString()}`)
    if (!response.ok) {
      throw new Error(`npm registry search failed: ${response.status} ${response.statusText}`)
    }
    const data = await response.json() as NpmSearchResponse
    const installed = this.ctx.profileManager.snapshot().dependencies

    const results: ExtensionSearchResult[] = data.objects.map((obj) => {
      const name = obj.package.name
      const installedVersion = installed[name]
      return {
        name: npmPackageName(name),
        version: obj.package.version,
        description: obj.package.description ?? '',
        keywords: obj.package.keywords ?? [],
        installed: installedVersion !== undefined,
        ...installedVersion === undefined ? {} : { installedVersion },
      }
    })

    return {
      results,
      total: data.total,
      query,
    }
  }
}

export default ExtensionsRegistryGateway
