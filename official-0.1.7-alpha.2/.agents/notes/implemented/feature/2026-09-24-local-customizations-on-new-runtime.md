# Agent Note: Local customizations on the current runtime

Status: implemented

English | [中文](2026-09-24-local-customizations-on-new-runtime.zh.md)

## Problem

The older workbench added local Memory, managed capability settings, and a Skin Center against APIs removed in the current Harness. Copying those packages unchanged leaves settings writes, browser communication, and image uploads unable to run.

## Decision

Memory and managed capabilities use the Host's live plugin configuration fields and generated Remotes. The Memory provider stores facts in its storage domain and logs extraction requests and outcomes. The capability manager saves its entry list under its configured plugin entry and activates enabled providers. The browser pages use the current Client store and Settings slots.

Skin preferences use the shared ConfigForm for the Host's `skin-center` entry. Image upload and removal use authenticated Connection Fetch routes; the upload route streams at most 20 MiB into a random reference under the Harness home. A separate GET route serves only a validated reference for CSS backgrounds. The browser applies the glass variables to the current frame CSS.

## Alternatives considered

**Retain the old settings scope and RPC channel.** The current runtime no longer supplies those APIs, so this cannot produce a working migration.

**Store image data in browser storage.** That would lose the Host-owned image across browser profiles and leave a different deletion rule.

**Bundle MCP commands as packages.** Capability entries instead configure existing providers and avoid executing a package installation as a side effect of editing a form.

## Consequences

Memory extraction can call the selected model and consumes its account quota. Managed MCP stdio processes run with Host user permissions. Images remain on disk if the Skin Center package is removed without deleting its background first. Existing sessions are not guaranteed to rebuild their available tools after a capability edit.

## Testing

The assembled Web settings scenarios exercise Memory preference and fact persistence, capability save and remove, and Skin Center upload, image serving, removal, and glass preference persistence. The Host and Client compiler faces and complete build pass.
