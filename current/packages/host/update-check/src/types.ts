/** Update-check result payloads. */

/** An official release asset that installs the current desktop platform. */
export interface DesktopInstaller {
  /** Asset filename shown to the user. */
  readonly name: string
  /** Official GitHub download URL for the asset. */
  readonly url: string
  /** GitHub's SHA-256 digest when the release API supplies one. */
  readonly sha256?: string
}

/** Outcome of one official GitHub Releases version comparison. */
export interface UpdateCheckResult {
  /** The running version, or null when the host did not report one. */
  readonly currentVersion: string | null
  /** The newest published official SemVer release, without its tag prefix. */
  readonly latestVersion: string
  /** Whether the running version precedes the latest official release. */
  readonly updateAvailable: boolean
  /** Canonical DeepSeek Harness GitHub page for the latest official release. */
  readonly releaseUrl: string
  /** GitHub's publication timestamp, when supplied by the official release. */
  readonly publishedAt: string | null
  /** Matching desktop installer asset, or null when the release does not supply one. */
  readonly desktopInstaller: DesktopInstaller | null
}
