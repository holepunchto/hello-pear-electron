# OTA update behavior

> Read before touching the update flow or update UI, adding P2P data to the
> worker, or when debugging how OTA updates land. Only
> non-obvious, code-verified facts — the code is the reference for everything
> else. Index: [AGENTS.md](../AGENTS.md).

Flow: stage a new build (as described in README) → the worker's swarm replicates the drive → the
updater mirrors the bundle → pipe strings flip the renderer UI → apply → relaunch.

Timing:

- Immediate check at every launch; after a drive append, a check on a randomized
  delay (drawn once per process, ≤1 h by default; appends within 60 s of boot check
  immediately; each new append reschedules the pending check).
- Only strictly-newer semver wins. **No downgrade path** — a rollback must be
  re-staged under a _higher_ version.

Apply:

- Works: macOS `.app` and Linux AppImage (`fsx.swap`), Windows MSIX (`addPackage`)
  or `.exe` (rename dance). **Impossible on snap/flatpak** (swap target is the
  read-only install mount) — those update via their stores; an attempted apply
  throws in the worker, which replies `pear:updateFailed <message>`, and the
  renderer shows the error.
- One-shot latch: `applied = true` is set **before** the swap → a failed apply
  can't be retried in-process. The main promise rejects on `pear:updateFailed` or
  a closed pipe but has no timeout, so a worker that never replies still hangs.
- Dev (`--updates`): download path only — apply would target a file named `'null'`.

Seeding / replication:

- Apps join the drive client-only and never seed — run dedicated `pear seed`ers.
- `store.replicate` is registered **only when updates are enabled**: app data in
  the worker's corestore won't replicate under the dev default `--no-updates`.
  When adding app P2P storage, hoist `swarm.on('connection', (c) =>
store.replicate(c))` out of the updates-gated block and `swarm.join` your app
  topic separately — only the updater-drive join stays gated behind `updates`.

Surface the template doesn't use (see the `pear-runtime` / `pear-runtime-updater`
READMEs): updater opts `delay` (rollout cap; `0` = instant, good for tests),
`storage`, `bootstrap` (local DHT), `bundled`; events `error` (attach a listener or
a crash), `update-scheduled`, `updating-progress`, `updating-delta`;
`updater.next` = staged path for custom install logic. `PearRuntime` without
`store`/`swarm` creates its own (pass both or neither).
