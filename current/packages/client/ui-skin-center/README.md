# @deepseek-ai/dsh-client-ui-skin-center

English | [中文](README.zh.md)

Skin center plugin: one Settings section (`skin-center`, order 30) owning two appearance features — a custom animated background and the glass panel effect. The glass card tunes `--dsw-glass-opacity` / `--dsw-glass-blur` (20–100 %, 0–40 px) for all three frame columns that [ui-layout](../ui-layout/README.md) paints; sliders preview live on `input` and persist once on release. The background card uploads a picked image (gif/png/jpeg/webp/avif, ≤ 20 MiB) through the `/skin-center` RPC channel, after which the Host stores it under `<harness home>/skin-center/backgrounds/` behind an unguessable random ref and serves it at `/skin-center-image/<ref>`; the browser paints it as a fixed body layer (`body[data-dsh-skin-bg]::before`) with adjustable scrim, blur, and cover/contain, and ui-layout's mesh gradient yields while it is active.

All preferences live in one durable settings namespace (`ui-skin-center`) through the Host user-settings document (`settings.yaml` under the harness home), following the ui-theme persistence pattern: loopback browsers read and write through the settings scope with revision-serialized writes; remote browsers stay process-local (the settings API is loopback-only). Defaults equal ui-layout's CSS fallbacks, so a page renders identically before the section loads.

Upload security: the RPC channel rides Connection's `trusted-host` authority — the Host-side origin/Host fence rejects DNS-rebinding and cross-site requests before the handler runs. Store refs are minted server-side (`<22-char base64url id><ext>`), never derived from user input, so a ref cannot encode a path; reads re-fence the resolved path under the store directory and re-enforce the size cap. The image route answers GET only; its ref is a capability token exposing nothing beyond the image the uploader placed.

## Model Experience

None, as the plugin manages browser appearance; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Remote browsers cannot persist or upload** — settings RPCs are loopback-only and uploads ride the same trusted channel; a remote browser keeps its in-memory view.
- **Stored images outlive their settings section** — removing a background deletes the stored file, but uninstalling the plugin leaves `<harness home>/skin-center/backgrounds/` residue; the directory is inert without the plugin.
- **Uploads are base64-in-JSON** — sized for a 20 MiB image over the loopback bridge; a streaming route would be needed for larger art.
