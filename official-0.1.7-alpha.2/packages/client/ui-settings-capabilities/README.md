---
description: "Web settings pages for managed skills, MCP connections, and subagent tools."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-settings-capabilities

English | [中文](README.zh.md)

## Summary

This package edits the Host capability manager through generated Remotes and reports activation status.

## Table of Contents

- [Details](#details)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

## Details

Registers one Settings section for each of the Host capability manager's `skill`, `mcp`, and `subagent` entries. The three rows share a collapsible **Capabilities** navigation group. Each page edits JSON configuration, displays saved and runtime activation state separately, and offers enable, disable, edit, remove, and reconnect actions where applicable.

The sections use the shared Settings text scale and theme colors; JSON editors use the application's code font.

Skill configuration selects an existing absolute local directory. MCP configuration supports stdio and Streamable HTTP; stdio starts a command on the Host with the local user's permissions, outside the session file sandbox. Put secrets in credential references instead of JSON values. Subagent configuration selects an already registered provider and cannot promise that an external worker inherits sandbox restrictions. The plugin catalog remains a separate tab under Plugins settings and installs npm bundles into the active profile.

## Dev Note

The runtime entry points and composition metadata live in this package's `src/` and `package.json`.

## Model Experience

### Enabled capabilities

#### What the model sees

The settings pages send Host Remote requests only. On later Agent requests, enabled `mcp` connections contribute their discovered tools, enabled `subagent` entries contribute delegation tools, and registered `skill` directories are available to the skill catalog consumer.

#### Token effect

The pages add no request tokens. Tool declarations and skill-catalog content depend on enabled entries and their provider configuration.

#### KV Cache effect

Saving, enabling, or removing an entry can change later tool declarations or skill context and therefore provider cache reuse; the settings pages do not assemble model input.

## Known Limitations and Deferred Work

- **Configuration uses JSON** — this page does not provide field-specific forms, import, export, or package installation for skills.
- **MCP connectivity is lifecycle-only** — reconnect restarts the configured fiber but does not run an independent tool probe.
- **Provider setup is external** — subagent roles can use only a provider already registered by the Host composition.
