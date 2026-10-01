# @deepseek-ai/dsh-host-update-check

English | [中文](README.zh.md)

Update check for the official DeepSeek Harness GitHub repository, `deepseek-ai/deepseek-harness`. `UpdateCheckGateway` registers the `updateCheck` service and publishes one generated direct Remote, `updateCheck/check`, which reads that repository's GitHub Releases API, ignores drafts and invalid version tags, and reports whether the installed version precedes the newest published semantic version. The result also carries the canonical official release URL, its publication time, and one official GitHub installer asset matching the running desktop platform and architecture when one exists. The asset includes GitHub's SHA-256 digest when available. External URLs are accepted only when they stay under the official repository's GitHub release paths and identify the reported release asset. The current version is resolved from the installed package's `package.json` at construction, or supplied explicitly through config.

The service only compares versions; it does not download or install anything. Public payload types live under `./types`; Typert generates the Host and Client Remote artifacts exposed by `./typert` and `./remote`.

## Model Experience

None, as this Host-only check registers no prompt, tool, message, or provider request.

#### KV Cache effect

None; this package never assembles model input.

## Known Limitations and Deferred Work

- **No update execution** — this package only checks official releases; downloading and applying an update is outside its scope.
