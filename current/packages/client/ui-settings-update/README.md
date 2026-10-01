# @deepseek-ai/dsh-client-ui-settings-update

English | [中文](README.zh.md)

Official update surface for Web Settings. It registers the `update` `settings.section` and an icon action in `sidebar.footer.action`; the icon opens Settings directly on the update page. Entering the page and pressing **Check again** call the generated `updateCheck` Remote. An indeterminate progress bar remains visible while that request is pending; it does not claim a download percentage. The card identifies the official source, compares the current and latest versions, shows the official publication time, and links only to the official DeepSeek Harness release. When a newer release has a matching official desktop installer, **Update DeepSeek Harness** downloads it into Downloads with byte-based progress and cancellation, then opens the completed installer through the operating system. Ordinary Web clients retain an official download link. When the release has no matching installer, the card states that fact. Installation still follows the operating system's prompts; neither client replaces the source checkout.

## Model Experience

None, as this UI-only package registers no prompt, tool, message, or provider request.

#### KV Cache effect

None; this package never assembles model input.

## Known Limitations and Deferred Work

- **No background polling** — the sidebar action opens the Settings page; it does not fetch releases until that page is mounted or the user checks again.
