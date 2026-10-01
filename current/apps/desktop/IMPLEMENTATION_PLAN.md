# Desktop execution-mode implementation plan

## Current state

- `apps/desktop` is an Electron shell that starts the repository's `dsh web` server on loopback and opens its served client.
- The new-session screen exposes Agent presets (`standard`, `code`, `minimal`, `cordis`, and user-authored presets) beside the workspace picker as composition choices.
- `ui-plan` already records Plan state through `/plan` and `plan/mode`; `ui-permission-presets` records sandbox and approval choices through `/permission`.
- The General settings panel opens and contains Agent preset, default permission, language, appearance, and input behavior settings. Its fixed dialog is mounted below a sidebar subtree with `backdrop-filter`, which constrains the dialog to the sidebar instead of the viewport.

## Decision gate: mode semantics

- **Plan** sets `read-only`, then enables `/plan`; the log records both permission facts and plan state. If Plan activation fails, read-only remains in force.
- **Auto** disables Plan, then sets `workspace-write`; execution remains sandboxed to the workspace and permitted temporary directories, with the existing approval policy for wider retries.
- **Full autonomy** requires an explicit in-app risk acknowledgement, disables Plan, then sets `danger-full-access`; this preset intentionally has no sandbox and no approval prompts.
- The mode control reports the host-backed session state. It never treats a failed or unavailable command as a successful mode switch.
- Keep the Agent preset chooser beside the workspace picker and keep the settings/authoring entry. Agent presets describe plugin composition and remain separate from execution permission.

## Implementation scope

1. Extend the existing composer permission control to offer Plan, Auto, and Full autonomy using the existing `/plan` and `/permission` command paths.
2. Keep Full autonomy behind the existing risk-confirmation component and make command failures visible without leaving an unsafe partial transition.
3. Preserve the new-session Agent preset chooser beside the workspace picker together with the settings panel and advanced preset management.
4. Portal the Settings dialog to `document.body` so the sidebar's backdrop-filter cannot constrain it; cover the portal placement with a focused regression test.
5. Update the owning package READMEs, the assembled Web snapshot/e2e coverage, and an implemented Agent Note.
6. Leave Electron boot behavior and General settings navigation unchanged; verify both in the running desktop app.

## Target files

- `packages/client/ui-conversation/src/client/skeleton/PermissionSelect.tsx`
- `packages/client/ui-conversation/src/client/skeleton/InputBar.tsx`
- `packages/client/ui-conversation/src/client/locales.ts`
- `packages/client/ui-settings-general/src/client/SettingsRoot.tsx`
- `packages/client/ui-settings-general/tests/settings-root.client.spec.tsx`
- `packages/client/ui-settings-general/README.md` and `README.zh.md`
- `packages/client/ui-primitives/src/Modal.tsx` and its README pair
- `packages/client/ui-conversation/tests/input-bar.client.spec.tsx`
- `apps/web/tests/agent-preset-selection.e2e.ts` and its expected snapshots
- `packages/client/ui-conversation/README.md` and `README.zh.md`
- `packages/client/ui-agent-preset/README.md` and `README.zh.md`
- `.agents/notes/implemented/feature/2026-09-22-desktop-execution-modes.*`

## Acceptance

- [x] The new-session screen exposes the Agent preset chooser beside the workspace picker, separate from the execution-mode menu.
- [x] The composer exposes Plan, Auto, and Full autonomy and applies the matching host commands in the safe order above.
- [x] Full autonomy cannot be enabled before the acknowledgement is checked; canceling makes no command call.
- [x] A failed transition remains at the last successfully applied permission/plan state and is surfaced to the user.
- [x] Settings opens as a full-viewport panel, closes, and still exposes its existing General, Model, Plugin, Agent preset, and appearance controls.
- [x] Focused GUI tests, the assembled keyless snapshot/e2e check, and a live Electron interaction check pass.

## Verification

- `pnpm exec vitest run packages/client/ui-settings-general/tests/settings-root.client.spec.tsx packages/client/ui-conversation/tests/input-bar.client.spec.tsx` — 90 tests passed.
- `pnpm exec tsc -b packages/client/ui-settings-general/tsconfig.json packages/client/ui-conversation/tsconfig.json packages/client/ui-primitives/tsconfig.json --pretty false` — passed.
- `pnpm run build:lib:client` and `pnpm run build:web` — passed.
- `DSH_SNAPSHOT=refresh pnpm exec vitest run --config vitest.web.config.ts apps/web/tests/agent-preset-selection.e2e.ts` — 7 tests passed; expected hero and mode-menu snapshots refreshed.
- Electron GUI — verified the three mode choices and a centered full-width General Settings panel; left the running app on Settings without changing the saved default Agent preset or permission.
- `pnpm run doc-sync` — 21 gates passed, 7 failed on existing stale catalogs, JSDoc, and README issues outside the changed files; see the command output for exact findings.

## Explicit non-goals

- Do not delete or rewrite the user's `梁神模式` preset or other preset files.
- Do not change the default Agent preset or default permission in user settings.
- Do not claim workspace sandboxing confines reads, network access, or process visibility; the existing workspace-write sandbox does not.
- Do not alter packaged/release behavior or claim release acceptance from a development Electron launch.
