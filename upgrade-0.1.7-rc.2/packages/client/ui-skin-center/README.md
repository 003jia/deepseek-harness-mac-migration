---
description: "Web appearance settings for glass panels and stored image backgrounds."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-skin-center

English | [中文](README.zh.md)

## Summary

This package persists glass preferences and manages a Host-stored image background.

## Table of Contents

- [Details](#details)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

## Details

The Skin Center Settings page adjusts the three column glass effect and a whole window image background. Glass opacity and blur are applied as CSS variables during slider movement and saved when the user releases the slider. The background accepts gif, png, jpeg, webp, or avif files up to 20 MiB. It supports a scrim, blur, and cover or contain sizing.

Preferences use the Host's live `skin-center` plugin configuration through the shared settings form. A loopback Web client persists them in the user settings document; a remote Web client keeps the settings form unavailable. The Host accepts image uploads through an authenticated streaming Connection route at `/api/skin-center/uploadBackground`, stores an opaque random reference under the harness home, and serves the image through `/skin-center-image/<ref>`. Removal deletes that file through an authenticated route. The image route accepts GET only and validates the reference and storage path.

## Dev Note

The runtime entry points and composition metadata live in this package's `src/` and `package.json`.

## Model Experience

None, as appearance preferences and background images do not enter model requests.

#### KV Cache effect

None.

## Known Limitations and Deferred Work

- Image data remains on disk if the plugin is removed without first removing the background in Settings.
- A remote Web client cannot persist skin preferences; the Host's settings form is loopback only.

No invariant companion is published because skin preferences are owned by Settings and background references are validated at the request path.
