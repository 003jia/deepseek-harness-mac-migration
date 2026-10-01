# Agent Note: Local Memory and Settings-managed capabilities

Status: implemented

English | [中文](2026-09-23-memory-and-settings-managed-capabilities.zh.md)

## Problem

Users need to control whether saved facts enter future model requests, choose whether completed turns are summarized into durable memory, and manage common local capabilities without editing the profile by hand. These controls also need to state where model calls and executable MCP processes run.

## Decision

The Host owns local Memory in the configured storage-domain backend, separate from session history. Its `enabled` preference defaults off and its `autoExtract` preference defaults on but only takes effect while Memory is enabled. Automatic extraction runs after a completed `turn/end` against the user messages for that turn, using the conversation's recorded model route with `purpose: 'memory'`; the exact auxiliary input and outcome are logged. Recall adds the newest shared and exact-workspace facts within a configured character limit. Users can manually extract a loaded conversation and can inspect, edit, and delete entries. Deletion stores a content tombstone; turning Memory off retains data and settings but prevents future extraction and recall.

Settings exposes independently addressable Skill, MCP, and Subagent sections under the collapsible Capabilities group. The Host capability manager serializes changes, persists non-secret configuration, and reports saved enablement separately from activation state. Skill entries register an existing absolute directory without copying or deleting its files. MCP entries start stdio commands on the Host or connect Streamable HTTP, with credentials resolved by reference. Subagent entries use an already registered provider. The existing Plugins settings area keeps package-card configuration and npm bundle install, update, and removal.

The Plugins extension tab links to the `dsh-plugin` GitHub Topic that the official DSH README recommends for discoverability. Topic repositories and npm search results are community sources; this checkout does not claim an official-reviewed catalog or direct official registry API. A GitHub Topic link is discovery only and does not itself install a repository.

## Alternatives considered

**Treat saved conversation history as Memory.** Rejected because users need a separate control for facts injected into future requests, while session logs remain governed by their existing retention and replay owners.

**Use a third-party MCP memory server as the default.** Rejected because local Memory should work without an external process, account, or separate storage setup; generic MCP remains available for users who choose an external provider.

**Give every capability family a bespoke settings schema in the first version.** Rejected in favor of one validated JSON editor over the existing Host providers, with family-specific field constraints and examples; dedicated forms can follow without changing provider ownership.

**Call the GitHub Topic an official plugin catalog.** Rejected because the official README recommends it only for discoverability and the topic contains community repositories. npm search stays community discovery until an official directory and its install contract are verifiable.

## Consequences

Memory extraction consumes the selected conversation provider's account, cost, and model behavior; disabling it stops future calls but cannot remove facts from already sent requests or session logs. Model-extracted facts require user review, recall is based on exact workspace matching and recency, and credential detection is heuristic. Skill entries refer to host paths, stdio MCP processes use the local user's permissions outside the conversation file sandbox, and external subagent providers are not guaranteed to inherit that sandbox. Plugin bundle operations remain a profile-wide feature and successful install or removal requires restarting the Host in this checkout.

This feature partially updates the negative scope in [third-party memory MCP examples](2026-07-31-third-party-memory-mcp-examples.md): those examples still provide no memory-specific installer, provider service, migration, or support policy; the local Memory service and generic MCP settings are separate features. The [desktop execution-mode decision](2026-09-22-desktop-execution-modes.md) owns the sandbox-autonomy selection and its permission mapping.

## Testing

Local checks passed for Cordis configuration, client package dependencies, package invariants, built invariant companions, Host and client TypeScript compilation, Web assets, and 139 focused UI/plugin tests. The Electron desktop opened the current Web profile; its plugin inventory showed Memory and the capability manager mounted, and the Memory, Skill, MCP, Subagent, and Plugins settings pages rendered. The local extraction model path, four Memory preference combinations, real MCP connection and tool call, provider-backed subagent call, plugin install/restart flow, and local sandbox escape rejection remain unverified acceptance work.
