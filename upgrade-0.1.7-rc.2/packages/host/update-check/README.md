---
description: "Host service for official release comparison and source staging."
kind: "package-reference"
---

# @deepseek-ai/dsh-host-update-check

English | [中文](README.zh.md)

## Summary

This Host service compares official releases and stages custom commits beside the running checkout.

## Table of Contents

- [Details](#details)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

## Details

`UpdateCheckGateway` compares the configured or installed version with published semantic versions in the official `deepseek-ai/deepseek-harness` GitHub Releases API. It ignores drafts and invalid tags. `updateCheck/check` returns the newest version, its official release URL and publication time, and a platform matching desktop installer asset when one is published. Release and asset URLs must remain under the official repository's GitHub release paths.

With `sourceRoot` configured, `updateCheck/stageSource` prepares a newer release beside that checkout. It requires a clean, named Git branch and the DeepSeek Harness root package. It fetches the official release tag, creates a sibling worktree, and rebases the branch's custom commits onto that tag. A conflict leaves the new worktree available for resolution. The original checkout is not changed. This operation may take time and requires Git and network access.

The service does not install dependencies, build, start, or switch to the prepared checkout. The result includes its absolute path and whether the rebase completed or needs conflict resolution. Typert generates the Host and Client Remote artifacts exposed through `./typert` and `./remote`.

## Dev Note

The runtime entry points and composition metadata live in this package's `src/` and `package.json`.

## Model Experience

None, as the Host checks release metadata and stages Git source without contributing model input.

#### KV Cache effect

None.

## Known Limitations and Deferred Work

- Git worktrees and a clean committed customization branch are required for source staging. The service does not update a source archive without Git history.
- An installation, build, and switch step is left to the operator after staging.

No invariant companion is published because the update service reads Git and official release metadata on demand instead of maintaining a mirrored repository state.
