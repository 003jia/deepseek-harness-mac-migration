# @deepseek-ai/dsh-host-profile-manager

English | [中文](README.zh.md)

Transactional profile package management for trusted clients. `ProfilePackageManager` registers the `profileManager` service and publishes four generated direct Remotes: `snapshot`, `installPackage`, `update`, and `removePackage`. Each mutation runs the matching `pnpm` command in the active profile directory (derived from `ctx.baseUrl`), reconciles the `dsh.profile.bundles` layer list against the installed state exactly like `dsh plugin` does, and restores the captured manifest when pnpm fails. Operations are serialized in process; every successful mutation returns `restartRequired: true` because bundles apply at boot.

Only registry package specs are accepted — paths, URLs, and git specs are rejected — since this API serves the registry marketplace, never arbitrary package-manager arguments. Public payload types live under `./types`; Typert generates the Host and Client Remote artifacts exposed by `./typert` and `./remote`.

## Public types

`ProfileSnapshot` reports the active profile directory, ordered bundle layers, and installed dependency versions. `PackageOperationResult` identifies an install, update, or removal and reports its success, error detail, and restart requirement.

## Model Experience

None, as this Host-only package manager registers no prompt, tool, message, or provider request.

#### KV Cache effect

None; this package never assembles model input.

## Known Limitations and Deferred Work

- **In-process serialization only** — the operation queue serializes this service's calls but does not lock against a concurrent `dsh plugin` CLI process.
- **No automatic restart** — dsh cannot relaunch itself; the client surfaces the restart requirement and the user restarts manually.
- **Rollback covers the manifest only** — a failed pnpm run restores `package.json` but does not uninstall partially written `node_modules` content.
