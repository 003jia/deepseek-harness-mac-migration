/**
 * Transactional profile package management for trusted clients: install,
 * update, and remove profile bundles through pnpm, then reconcile the
 * `dsh.profile.bundles` layer list against the installed state.
 * @module @deepseek-ai/dsh-host-profile-manager
 */

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import {
  readProfileManifest,
  resolveBundleDir,
  writeProfileManifest,
  type ProfileManifest,
} from '@deepseek-ai/dsh-app-boot'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import type {} from 'zod'
import type {
  PackageOperationId,
  PackageOperationKind,
  PackageOperationResult,
  ProfileSnapshot,
} from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Transactional profile package management for trusted clients. */
    profileManager: ProfilePackageManager
  }
}

/** pnpm binary name; Windows resolves it through its .cmd shim. */
const PNPM = 'pnpm'

/** npm registry package-name spec: scoped or unscoped, optional version suffix. */
const PACKAGE_SPEC = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(?:@[^\s@]+)?$/

function packageOperationId(value: string): PackageOperationId {
  return value as PackageOperationId
}

/** Whether a resolved dependency exports a profile patch, i.e. is a bundle. */
function exportsPatch(profileDir: string, packageName: string): boolean {
  let dir: string
  try {
    dir = resolveBundleDir('dsh', packageName, join(profileDir, 'package.json'), profileDir)
  } catch {
    return false
  }
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as ProfileManifest
  return manifest.dsh?.bundle?.patch !== undefined
}

/** Run pnpm in the profile directory, capturing output for diagnostics. */
function runPnpm(profileDir: string, args: readonly string[]): Promise<{ code: number; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(PNPM, [...args], {
      cwd: profileDir,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString() })
    child.stderr.on('data', (chunk: Buffer) => { output += chunk.toString() })
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({ code: code ?? 1, output })
    })
  })
}

/** Remote-only service managing the active profile's plugin dependencies. */
export class ProfilePackageManager extends TypertRemoteService {
  private pending: Promise<unknown> = Promise.resolve()

  constructor(ctx: Context) {
    super(ctx, 'profileManager')
  }

  /**
   * The active profile directory, derived from the Loader's `baseUrl` (the
   * config-tree anchor is the profile directory in profile boots).
   * @returns the absolute profile directory.
   */
  private profileDir(): string {
    if (this.ctx.baseUrl === undefined) {
      throw new Error('profile-manager: ctx.baseUrl is unset — cannot derive the active profile directory')
    }
    return fileURLToPath(this.ctx.baseUrl)
  }

  /**
   * Reconcile `dsh.profile.bundles` against the installed state: a dependency
   * resolving to a `dsh.bundle`-declaring package joins the layer stack; a
   * dependency-listed name that no longer does leaves it.
   * @param before - the manifest captured before the pnpm run.
   * @param profileDir - the active profile directory.
   */
  private reconcile(before: ProfileManifest, profileDir: string): void {
    const after = readProfileManifest('dsh', profileDir)
    const beforeDeps = new Set(Object.keys(before.dependencies ?? {}))
    const dependencies = Object.keys(after.dependencies ?? {})
    const plugins = after.dsh?.profile?.bundles ?? []
    let changed = false
    for (const packageName of dependencies) {
      const isBundle = exportsPatch(profileDir, packageName)
      if (isBundle && !plugins.includes(packageName)) {
        plugins.push(packageName)
        changed = true
      }
    }
    const dependencySet = new Set(dependencies)
    for (const packageName of [...plugins]) {
      const wasDependency = beforeDeps.has(packageName) || dependencySet.has(packageName)
      const stillBundle = dependencySet.has(packageName) && exportsPatch(profileDir, packageName)
      if (wasDependency && !stillBundle) {
        plugins.splice(plugins.indexOf(packageName), 1)
        changed = true
      }
    }
    if (!changed) return
    after.dsh = { ...after.dsh, profile: { ...after.dsh?.profile, bundles: plugins } }
    writeProfileManifest(profileDir, after)
  }

  /**
   * Read the active profile's current plugin state.
   * @returns Profile directory, bundle layers, and installed dependencies.
   */
  @Remote('snapshot')
  snapshot(): ProfileSnapshot {
    const profileDir = this.profileDir()
    const manifest = readProfileManifest('dsh', profileDir)
    return {
      profileDir,
      bundles: manifest.dsh?.profile?.bundles ?? [],
      dependencies: manifest.dependencies ?? {},
    }
  }

  /**
   * Install a registry package into the active profile and reconcile bundles.
   * Accepts bare names or `name@version`; paths, URLs, and git specs are
   * rejected (this API serves the registry marketplace only).
   * @param spec - npm package name, optionally pinned with a version suffix.
   * @returns the operation result; success always requires a restart.
   */
  @Remote('installPackage')
  async install(spec: string): Promise<PackageOperationResult> {
    if (!PACKAGE_SPEC.test(spec)) {
      return {
        operationId: packageOperationId(randomUUID()),
        packageName: spec,
        kind: 'install',
        ok: false,
        error: `invalid registry package spec ${JSON.stringify(spec)} (paths, URLs, and git specs are rejected)`,
        restartRequired: false,
      }
    }
    return this.run('install', spec, ['add', spec])
  }

  /**
   * Update one installed package to its registry latest and reconcile bundles.
   * @param packageName - the installed package to update.
   * @returns the operation result; success always requires a restart.
   */
  @Remote('update')
  async update(packageName: string): Promise<PackageOperationResult> {
    if (!PACKAGE_SPEC.test(packageName) || packageName.includes('@')) {
      return {
        operationId: packageOperationId(randomUUID()),
        packageName,
        kind: 'update',
        ok: false,
        error: `invalid package name ${JSON.stringify(packageName)} (versions are resolved by the registry)`,
        restartRequired: false,
      }
    }
    return this.run('update', packageName, ['update', packageName])
  }

  /**
   * Remove an installed package from the active profile and reconcile bundles.
   * @param packageName - the installed package to remove.
   * @returns the operation result; success always requires a restart.
   */
  @Remote('removePackage')
  async remove(packageName: string): Promise<PackageOperationResult> {
    if (!PACKAGE_SPEC.test(packageName) || packageName.includes('@')) {
      return {
        operationId: packageOperationId(randomUUID()),
        packageName,
        kind: 'remove',
        ok: false,
        error: `invalid package name ${JSON.stringify(packageName)}`,
        restartRequired: false,
      }
    }
    return this.run('remove', packageName, ['remove', packageName])
  }

  /**
   * Execute one serialized pnpm operation with manifest rollback on failure.
   * @param kind - the operation kind for the result.
   * @param packageName - the targeted package.
   * @param args - pnpm arguments.
   * @returns the operation result.
   */
  private run(kind: PackageOperationKind, packageName: string, args: readonly string[]): Promise<PackageOperationResult> {
    const operationId = packageOperationId(randomUUID())
    const run = async (): Promise<PackageOperationResult> => {
      const profileDir = this.profileDir()
      if (!existsSync(join(profileDir, 'package.json'))) {
        return {
          operationId, packageName, kind, ok: false,
          error: `profile directory ${profileDir} has no manifest; start dsh through a profile first`,
          restartRequired: false,
        }
      }
      const before = readProfileManifest('dsh', profileDir)
      const { code, output } = await runPnpm(profileDir, args)
      if (code !== 0) {
        // pnpm may have partially written the manifest; restore the captured state.
        writeProfileManifest(profileDir, before)
        const tail = output.trim().split('\n').slice(-8).join('\n')
        return {
          operationId, packageName, kind, ok: false,
          error: tail.length > 0 ? tail : `pnpm exited with code ${code}`,
          restartRequired: false,
        }
      }
      this.reconcile(before, profileDir)
      return { operationId, packageName, kind, ok: true, restartRequired: true }
    }
    // Serialize operations: the previous run settles before the next starts.
    const next = this.pending.then(run, run)
    this.pending = next.catch(() => {})
    return next
  }
}

export default ProfilePackageManager
