# @deepseek-ai/dsh-host-extensions-registry

English | [中文](README.zh.md)

npm-based extensions catalog search for trusted clients. `ExtensionsRegistryGateway` registers the `extensionsRegistry` service and publishes one generated direct Remote, `extensionsRegistry/search`, which queries the npm registry search API (`registry.npmjs.org/-/v1/search`) with the configured `dsh-bundle` keyword, joins the results with the active profile's installed dependencies through the `profileManager` service, and returns the matching packages with installed-state flags and versions.

The registry is discovery, not trust: results are ordinary npm packages and this service neither validates nor endorses them. Public payload types live under `./types`; Typert generates the Host and Client Remote artifacts exposed by `./typert` and `./remote`.

## Model Experience

None, as this Host-only catalog service registers no prompt, tool, message, or provider request.

#### KV Cache effect

None; this package never assembles model input.

## Known Limitations and Deferred Work

- **No package detail endpoint** — `search` returns the search-page view only; version history, dist-tags, and tarball metadata are not exposed.
- **Keyword filter is fixed** — the `dsh-bundle` keyword is a constant, not a configurable field; a broader catalog needs a config-driven keyword or scope.