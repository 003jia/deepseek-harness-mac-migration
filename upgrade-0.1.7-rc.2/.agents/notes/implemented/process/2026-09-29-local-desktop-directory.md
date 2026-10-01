# Agent Note: Build a local Windows Desktop directory without release tooling

Status: implemented

English | [中文](2026-09-29-local-desktop-directory.zh.md)

## Problem

The Web command opens a browser and cannot supply the Electron desktop client. The release package command also compiles an NSIS installer helper and requires release policy configuration before it can produce an unpacked directory. Neither requirement applies to a local executable that is never published.

## Decision

The [local Desktop command](../../../../apps/desktop/README.md#local-windows-client) calls the existing package preparation path with an unsigned Windows directory target. It packs the same Web, Host, plugins, and runtime dependency closure as a release. A dedicated build flag omits installer helper compilation and embedded mandatory-update policy only for this local unsigned output. The application uses a distinct local app identifier and has no update feed. The output lives at the short repository-root `.desktop-local` path because the deeper release output path exceeds Windows' legacy path limit for bundled Python imports. A sidecar record associates the executable with its source checkout; the Desktop Host passes that path to the source-upgrade plugin instead of using its profile working directory.

The signed and ordinary unsigned release commands retain their existing policy, installer, signing, and preflight requirements. The local directory command has no upload step or release completion record.

## Alternatives considered

**Keep a shortcut to the Web command.** It still opens the browser rather than the Desktop shell and does not test Desktop plugin activation.

**Supply placeholder policy and signing settings to the release command.** Placeholder deployment metadata would enter an executable and could be mistaken for a qualified release.

**Require Visual Studio for an unpacked local directory.** The native helper belongs to the installer; the directory output does not use it.

## Consequences

Developers can run the actual Electron executable without release credentials or the installer compiler. The directory must remain intact and is not an installer or an official distribution. Moving the source checkout invalidates the recorded source-upgrade target until the local client is rebuilt. Local verification covers the packaged runtime smoke and a direct application launch; signed installation and updater behavior remain release qualifications.
