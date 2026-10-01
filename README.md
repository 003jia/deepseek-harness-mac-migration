# DeepSeek Harness plugin source migration

This private repository preserves four independent source snapshots from the Windows workstation for plugin adaptation on macOS.

| Directory | Origin | Plugin packages |
| --- | --- | ---: |
| `current/` | Main project directory, version `0.1.0-rc.8` | 239 |
| `official-0.1.7-alpha.2/` | Local `workbench-migration` checkout | 315 |
| `upgrade-0.1.7-rc.2/` | Local upgrade checkout | 322 |
| `upgrade-0.2.0-rc.2/` | Local upgrade checkout with an unfinished merge | 324 |

Each directory has its own `package.json`, `pnpm-lock.yaml`, `packages/`, and vendored source. Open and build one directory at a time. The `upgrade-0.2.0-rc.2/` files preserve the current working tree, including unresolved conflict markers; see `upgrade-0.2.0-rc.2.status.txt` before building it.

The `official-0.1.7-alpha.2/.migration/custom/` directory also contains five locally customized plugin packages. They are included even though the original checkout ignores that directory.

The migration omits Windows `node_modules`, package stores, build outputs, session data, credentials, and Git internals. The copies preserve source files and local edits, but do not preserve each checkout's Git history or merge index. The upstream repository is `https://github.com/deepseek-ai/deepseek-harness`.

On macOS, install Node.js `^22.19.0 || >=24.0.0` and pnpm `11.7.0`. Then, for the snapshot you want to adapt:

```sh
cd current # or another snapshot directory
pnpm install --frozen-lockfile
pnpm run build
```

Configure API keys locally on the Mac if needed; no `.env` file is included.
