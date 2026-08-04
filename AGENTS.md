# AGENTS.md

Holepunch's template for Electron apps with **peer-to-peer OTA updates** (no update
server). The demo UI is trivial on purpose: the plumbing is the product and forks build
their app on top of it. Stack: Electron ^40 + Forge ^7.11 (CommonJS), `pear-runtime`
(worker body in the `hello-pear-worker` package), prettier + lunte.
[README](README.md) = the human deployment manual (stage → provision → multisig).

Key fact: **the OTA updater does not run in Electron.** `electron/main.js` only
spawns a Bare sidecar (`workers/main.js`) and pipes bytes; the updater lives in the
worker.

## Commands

npm only — pnpm breaks `forge.config.js` (undeclared hoisted `pear-link`).

```sh
npm start                            # dev, updates OFF
npm start -- --updates               # dev + update download (apply can't work in dev)
npm start -- --storage <dir>         # second instance / custom storage
npm run lint                         # prettier --check . && lunte  (= CI)
npm run format                       # prettier --write . && lunte --fix
npm run package                      # → out/HelloPear-<platform>-<arch>/
npm run make                         # → installers in out/make/
```

`start`/`package`/`make` all fail at the forge gate until `package.json#upgrade`
holds a real key (`pear touch`) or `UPGRADE_KEY` is set — the committed value is a
placeholder. `UPGRADE_KEY` only helps the gate and _packaged_ builds (the hook
rewrites the packaged `package.json`); in dev the running app reads the committed
file, so with the placeholder on disk `npm start` opens the window but the worker
dies on the invalid link at boot (`--no-updates` doesn't prevent this — the
updater parses the link in its constructor). A working dev run needs a
well-formed key committed.

## Contracts: editing one side breaks the other, often silently

- Six-arg spawn argv order: `getWorker()` in `electron/main.js` ↔ the worker's positional reads
- Specifier `'/workers/main.js'`: renderer ↔ IPC channel names
- Pipe strings `updating`/`updated`/`pear:applyUpdate`/`pear:updateApplied`; FramedStream on both ends
- Node builtins used under `workers/` ↔ `package.json#imports`: Bare has no `events`,
  so in-project worker code needs a `{"bare": "bare-events", "default": "events"}`
  entry (hypercore and hyperswarm ship the same map). Dev silently resolves a hoisted
  npm shim, the packaged app prunes it — the worker then dies at boot with
  `MODULE_NOT_FOUND` and the UI shows nothing but a dead backend
- `productName` ↔ `AppxManifest.xml` Identity ↔ CI artifact names ↔ storage dirs
- `AppxManifest.xml` Publisher CN ↔ Windows signing cert (stable across builds)
- `pear.json#multisig`: **any edit = different production key**
- `package.json#version` ↔ generated package metadata (AppImage/Snap/MSIX/Flatpak) ↔ release metadata (metainfo.xml <release>, Flatpak URLs + sha512)

## Boundaries

You are a tool assisting the maintainer, not a substitute for them. Exceptions to
any rule here are the human's call: when a task seems to require one, stop and
surface the conflict instead of working around it. Exceptions are expected to be
rare.

- ✅ **Always:** if your change makes a _descriptive_ statement in AGENTS.md or
  `agent_docs/` false, update the doc and flag it in your summary; if it conflicts
  with a contract or boundary, stop and ask instead — never rewrite a rule to
  legalize your own change
- ✅ **Always:** check worker changes in a packaged build (`npm run package`) —
  Bare resolves modules differently there than in dev, so `npm start` passing
  proves nothing about the worker booting for a user. Work is done when lint
  passes and, for worker changes, the packaged app boots.
- ⚠️ **Ask first:** `pear.json`, `AppxManifest.xml` identity/publisher, new deps,
  electron bumps
- 🚫 **Never:** deployment and publishing (`pear stage`,
  `pear provision`, `pear multisig`, `pear seed`, pushing `v*` tags — that
  triggers npm publish), unless the user explicitly asked for exactly that in
  this session
- 🚫 **Never:** enable asar (breaks worker spawning); add CLI flags/launch surfaces
  without declaring them to paparam in `electron/main.js` (unknown argv crashes the
  packaged app); commit secrets

## Topic docs — match your task, read the doc BEFORE editing that area

Each `agent_docs/` file holds only code-verified facts you cannot deduce from this
repo's sources (cross-package contracts, failure semantics, dependency behavior);
each opens with its own scope statement. Routing:

- Editing `electron/`, `renderer/`, `workers/`, or debugging worker spawn/IPC/startup
  → [`agent_docs/architecture.md`](agent_docs/architecture.md)
- Touching the update flow or update UI, adding P2P data, or debugging missing
  updates → [`agent_docs/updates.md`](agent_docs/updates.md)
- Touching `forge.config.js`, `build/`, `flatpak/`, rebranding, or signing
  → [`agent_docs/packaging.md`](agent_docs/packaging.md)
- Touching `.github/`, or cutting/troubleshooting a release
  → [`agent_docs/releases.md`](agent_docs/releases.md)
