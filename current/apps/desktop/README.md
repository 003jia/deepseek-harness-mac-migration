# DeepSeek Harness desktop shell

English | [中文](README.zh.md)

The Electron app starts this checkout's `dsh web` server on a loopback port and loads it in one sandboxed window. Run `pnpm --filter @deepseek-ai/dsh-desktop start` from a prepared source checkout. The shell does not bundle or replace the source tree.

The update page checks `deepseek-ai/deepseek-harness` releases through the Host plugin. If a newer release has an official installer matching the current platform and architecture, **Update DeepSeek Harness** downloads it to the user's Downloads directory and opens it through the operating system when complete. Progress reflects bytes written; an unknown total remains indeterminate. A failed, cancelled, incomplete, or digest-mismatched transfer removes its partial file, while an existing download is never overwritten. Installation follows the operating system's prompts. **Open installer** can reopen a completed download. Without a matching official installer, the page shows the official release link and no update control. The shell never replaces this source tree.
