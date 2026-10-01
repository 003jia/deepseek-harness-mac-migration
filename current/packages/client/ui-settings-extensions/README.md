# @deepseek-ai/dsh-client-ui-settings-extensions

English | [中文](README.zh.md)

Extensions marketplace tab in Web Settings > Plugins. Registers a `settings.plugins.tab` contribution (id `extensions`) that searches npm for `dsh-bundle` packages through the generated `extensionsRegistry` Remote, renders result cards with installed state, and drives install, update, and removal through the `profileManager` Remotes `installPackage`, `update`, and `removePackage`. Successful mutations surface a restart-required notice; failures show the pnpm tail inline. The page also links to the `dsh-plugin` GitHub Topic recommended by the official DSH README for discovery. Topic entries are community repositories, not an official-reviewed catalog, and the link does not install GitHub repositories.

Search controls and result cards use the existing Settings typography, spacing, and theme colors.

## Model Experience

None, as this UI-only package registers no prompt, tool, message, or provider request.

#### KV Cache effect

None; this package never assembles model input.

## Known Limitations and Deferred Work

- **Search results are page-limited** — the registry query returns at most 25 results with no pagination.
- **Installed state is a snapshot** — the join against the profile manifest happens per search; a mutation in another window is not observed until the next search.
- **No official plugin registry API is configured** — npm search is community discovery, and the official DSH topic is an external discovery link only.
