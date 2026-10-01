---
description: "Web settings page for official release checks and source staging."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-settings-update

English | [中文](README.zh.md)

## Summary

This package checks official releases and prepares a separate updated source checkout.

## Table of Contents

- [Details](#details)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

## Details

The Web Settings update page compares the running version with official DeepSeek Harness GitHub Releases. It registers the `update` settings section and calls the generated `updateCheck` Remote on entry or when the user presses **Check again**. A pending check shows an indeterminate progress bar. The page reports the current and newest versions, publication time, and official release link.

When a newer release exists, **Update DeepSeek Harness source** calls `updateCheck/stageSource`. The Host fetches the release tag, creates a separate worktree beside the running checkout, and replays the current branch's custom commits. The page shows the new directory or a conflict state. The running checkout stays in use; the user resolves any conflicts, installs dependencies, builds, and launches the new directory.

## Dev Note

The runtime entry points and composition metadata live in this package's `src/` and `package.json`.

## Model Experience

None, as release checks and source staging do not contribute model input.

#### KV Cache effect

None.

## Known Limitations and Deferred Work

- The source action requires a clean named Git branch in a DeepSeek Harness checkout. It cannot upgrade a packaged desktop installation or an uncommitted checkout.
- The update page does not install dependencies, build, launch, or switch to the staged checkout.
- Checks run when the page mounts or the user requests one; there is no background polling.

No invariant companion is published because the page displays the Host update result and stores no independent upgrade state.
