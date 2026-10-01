# Agent Note: Side-by-side source updates

Status: implemented

English | [中文](2026-09-23-side-by-side-source-update.zh.md)

## Problem

A customized source archive has no Git history that can identify local commits or replay them onto a newer official release. Replacing its files in place can discard local work and leave a running Web process with mixed versions.

## Decision

The Web update page uses the official GitHub Releases API for version discovery. On a clean named Git branch, the Host fetches the selected official release tag, creates a sibling Git worktree, and rebases the current branch's commits onto it. The Remote reports the new absolute path and whether conflicts remain. The running checkout and process stay intact. The operator resolves conflicts, installs dependencies, builds, and launches from the staged directory.

The root checkout is validated by its package name and Git directory. The fetched target is resolved from the official release tag; the UI does not pass an arbitrary repository URL. Dirty and detached checkouts fail before a new worktree is created.

## Alternatives considered

**Overwrite the active checkout.** Rejected because a failed merge or build would modify the source backing the running process.

**Download a release archive.** Rejected because an archive cannot replay committed customizations or expose merge conflicts.

**Install a desktop package.** The desktop updater owns packaged application updates; it cannot preserve source customizations.

## Consequences

A prepared checkout is reviewable and reversible. Git conflicts remain local to its directory. A source archive must first become a Git customization branch. The button does not imply that the new directory has passed installation, build, or runtime checks.

## Testing

The source staging tests use local Git repositories for a successful rebase and a conflict. The Web settings scenario exercises the assembled update page and generated Remote with a deterministic release response.
