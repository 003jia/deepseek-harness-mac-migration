# Agent Note: Official desktop update entry

Status: implemented

English | [中文](2026-09-22-official-desktop-update-entry.zh.md)

## Problem

The desktop sidebar exposed an updater from a remote-access plugin that checked a personal package repository. Its Settings page had only a bare version comparison, so it did not identify the release source, explain installer availability, or give the user a trustworthy official destination.

## Decision

`dsh-host-update-check` reads only `deepseek-ai/deepseek-harness` GitHub Releases. It validates canonical release and download URLs before returning the official release page, publication time, and at most one installer asset matching the running platform and architecture. The Settings update page checks when opened and on explicit retry; an indeterminate bar represents that network request. It links only to those official URLs. When the Electron shell exposes its narrow preload bridge and a newer version has a matching installer, one **Update DeepSeek Harness** click downloads the asset and opens it through the OS after completion. The transfer reports received bytes, verifies the GitHub SHA-256 digest when supplied, and preserves existing files. Cancellation and failure do not open the installer. The operating system owns installation; no path replaces the running source checkout.

The update package contributes a sidebar action that opens Settings directly on its registered `update` section through the presentation-independent `settingsNavigator` service. A narrow footer selector removes the remote-access plugin's adjacent personal updater while retaining its remote-access button.

The `updateCheck/check` Client Remote schema carries the release URL, publication time, and installer asset fields. Rebuild `@deepseek-ai/dsh-api-remotes` after changing the Host result type: an older generated schema strips those fields from the response, and the update card then fails inside its slot boundary instead of rendering.

## Alternatives considered

**Keep the remote-access plugin's updater.** Rejected because its release state is owned by a personal package repository, not the official DeepSeek Harness project.

**Install automatically after a version check.** Rejected because an official release may have no platform installer, and source/local builds cannot safely replace themselves without an explicit installation lifecycle. An explicit update click launches the verified installer, leaving its installation prompts to the operating system.

**Make the sidebar action open a second modal.** Rejected because Settings already owns the update section and its focus, close, and accessibility behavior.

## Consequences

The sidebar keeps remote access but no longer presents a personal-repository updater. When an official release has no matching desktop asset, the UI clearly says so and offers the official release page instead of a misleading update action. When an asset exists, the desktop shell downloads it to the user's Downloads directory and opens it after one click; installation still requires the operating system's prompts. The one-shot navigation request is acknowledged after the shell applies it, preventing stale requests from reopening Settings.

## Testing

Focused unit and client tests cover official URL filtering, platform and architecture selection, digest handling, streamed byte progress, cleanup on checksum failure, pending checks, one-click installer opening, retry, sidebar opening, and Settings-section navigation. The shipped web composition's Playwright test captures the pending check and the no-installer result through the real Remote path. An end-to-end installer transfer remains unverified without a suitable release asset.
