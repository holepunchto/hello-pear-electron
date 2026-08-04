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

`start`/`package`/`make` all fail until `package.json#upgrade` holds a real key
(`pear touch`) or `UPGRADE_KEY` is set — the committed value is a placeholder.

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
- `package.json#version` ↔ flatpak manifest URLs + sha512 ↔ metainfo `<release>`

## Boundaries

- ✅ **Always:** if your change contradicts anything in AGENTS.md or `agent_docs/`,
  fix the doc in the same change (correct it — don't add new sections unless you have to)
- ✅ **Always:** check worker changes in a packaged build (`npm run package`) before
  staging — Bare resolves modules differently there than in dev, so `npm start`
  passing proves nothing about the worker booting for a user
- ⚠️ **Ask first:** `pear.json`, `AppxManifest.xml` identity/publisher, new deps,
  electron bumps
- 🚫 **Never:** enable asar (breaks worker spawning); add CLI flags/launch surfaces
  without declaring them to paparam in `electron/main.js` (unknown argv crashes the
  packaged app); push `v*` tags unless releasing (triggers npm publish); commit
  secrets

## Docs — read before touching that area

- [`agent_docs/architecture.md`](agent_docs/architecture.md) — IPC wiring + worker contract (`electron/`, `renderer/`, `workers/`)
- [`agent_docs/updates.md`](agent_docs/updates.md) — OTA timing/apply/limits + updater API forks can use
- [`agent_docs/packaging.md`](agent_docs/packaging.md) — forge/signing/store gotchas (`forge.config.js`, `build/`, `flatpak/`)
- [`agent_docs/releases.md`](agent_docs/releases.md) — CI + pear deployment (`.github/`, releases)
