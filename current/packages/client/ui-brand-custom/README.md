# @deepseek-ai/dsh-client-ui-brand-custom

English | [中文](README.zh.md)

Custom brand occupants for the Web client's sidebar and conversation Hero slots. When `DSH_CLIENT_BUILD_PROFILE` is not `official`, this plugin fills the brand slots with the custom name "嘉言成 harness".

The plugin is a direct mirror of `ui-brand-official` with the brand name swapped to the custom label. No logo or icon is rendered.

## Model Experience

None, as this browser-side presentation occupant registers nothing model-facing.

#### KV Cache effect

None; this package never assembles model input.

## Known Limitations and Deferred Work

- **No logo** — The custom brand only renders text; no logo or icon is provided.
- **Static name** — The brand name "嘉言成 harness" is hardcoded; a future version could accept a configuration value.
