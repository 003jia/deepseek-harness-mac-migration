# Agent Note: The skin center — custom background and glass settings

Status: implemented

English | [中文](2026-08-19-skin-center-background-and-glass.zh.md)

## Problem

Two appearance features needed a home. First, a glassmorphism tuner had landed in ui-layout as a floating WIP panel (`GlassControls`): two sliders writing `--dsw-glass-opacity`/`--dsw-glass-blur` onto the document root, with hardcoded defaults duplicated between React state and the CSS `:root` fallback, no persistence (every reload reset to 85 %/12 px), hardcoded Chinese labels bypassing the locale service, and a permanent floating chrome element. Second, users wanted a custom animated background (their own GIFs) — something no first-party surface offered, though the community `dsh-skins` project in the scratch tree proved the shape: a wallpaper store under the harness home, a host image route, and a fixed body layer behind translucent panels.

The product decision (user-confirmed): local-file upload as the only image source (no path/URL entry), the floating panel removed with its function absorbed into a new Settings section, and the glass effect extended to all three frame columns (the WIP covered only sidebar and details).

## Decision

One new plugin, `@deepseek-ai/dsh-client-ui-skin-center`, owns the whole feature; ui-layout only consumes CSS variables it already knew.

**Persistence.** A single durable settings namespace `ui-skin-center` (seven scalar fields) follows the ui-theme pattern: the Host half registers the schema; the browser binds `ctx.settingsScope` and adopts pushed invalidations. Defaults equal ui-layout's CSS `:root` fallbacks, so the pre-plugin paint and the loaded section agree and the runtime overwrite at defaults is a no-op. Live slider drags preview on `input` and persist once on pointer/keyboard release — the gesture-order serialization the settings scope already owns handles the write.

**Cross-plugin collaboration stays on the DOM.** The controller writes `--dsw-glass-*` on the document root and the background layer on the body; ui-layout's frame styles read them. The layout also accepts `--dsh-pane-opacity` and `--dsh-sidebar-opacity`, and yields its frame plus conversation, details, and sidebar roots under either `data-dsh-skin-bg` or the compatible `data-dsh-wallpaper` body marker. No cross-plugin value import (client bundle purity gate), no new service seam — the CSS custom properties and body markers are the contract, documented on both sides.

**Uploads ride an existing trusted channel, not a new route.** A dedicated logical RPC channel `/skin-center` (`connection.rpc.handle`, `trusted-host` authority) carries base64 uploads and removals. This was chosen over a bespoke HTTP route because Connection's Host-side fence (Origin/Host, DNS-rebinding, cross-site markers) already exists there and the loopback bridge already tolerates multi-MiB bodies. The image route `/skin-center-image` exists only because CSS `url()` and `<img>` cannot ride the RPC envelope; it answers GET with a stored file's bytes and nothing else.

**Refs are server-minted capabilities.** Stored files are named `<22-char base64url id><ext>`; the name never derives from user input, so a ref cannot encode a path. Reads re-fence the resolved path under the store directory (defense in depth — the ref pattern already excludes separators) and re-enforce the 20 MiB cap. The image route keeps no origin fence of its own: the ref is unguessable and exposes only the art the uploader placed.

**The background yields, the app clears.** The plugin's injected stylesheet paints `body[data-dsh-skin-bg]::before` (scrim + blur + size) and clears `body`'s own background; ui-layout's `.frame` drops its mesh gradient under the same `data-dsh-skin-bg` attribute so the two layers never stack. Scrim uses white over the image in light mode and dark navy in dark mode, keyed off the existing `data-ds-dark-theme` attribute.

## Alternatives considered

- **Path/URL entry for backgrounds.** The community skin center offers a text input; we cut it. Upload covers the confirmed requirement, and a path field reopens host-filesystem questions (which directories, which trust) the capability-ref design avoids entirely.
- **Streaming uploads.** base64-in-JSON caps practical images at ~20 MiB over loopback. Fine for GIF backgrounds; a streaming route is the documented follow-up if larger art matters.
- **Sync for remote browsers.** Settings RPCs are loopback-only, so a remote browser's skin stays process-local — inherited from the persistence pattern, not reintroduced here.
- **Per-column glass tuning.** One opacity/blur pair covers all three columns; the WIP panel's scope question (which columns) was settled as "all", not made a setting.

## Consequences

Package suites pin the schema defaults and clamp, the store (extension/size/ref fences, directory and over-cap refusals, read-failure misses), the RPC fold (upload/remove happy paths, malformed payloads, non-Error rejections, default-store delegation via `DSH_HOME`), the image route (GET-only, 404/405), the controller (scope adoption, DOM application, preview-vs-set, upload/remove flows, style-tag idempotence), the section component (copy via `t`, slider preview/commit, picker reset, failure notice), and the apply wiring (locale, section registration, boot projection, teardown). The per-file 100 % coverage gate passes with two justified `v8 ignore` comments on the structurally unreachable directory-fence arms.

## Testing

Package suites pin the schema defaults and clamp, the store (extension/size/ref fences, directory and over-cap refusals, read-failure misses), the RPC fold (upload/remove happy paths, malformed payloads, non-Error rejections, default-store delegation via `DSH_HOME`), the image route (GET-only, 404/405), the controller (scope adoption, DOM application, preview-vs-set, upload/remove flows, style-tag idempotence), the section component (copy via `t`, slider preview/commit, picker reset, failure notice), and the apply wiring (locale, section registration, boot projection, teardown). The per-file 100 % coverage gate passes with two justified `v8 ignore` comments on the structurally unreachable directory-fence arms.
