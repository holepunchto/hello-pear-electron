# Packaging gotchas (`forge.config.js`, `build/`, `flatpak/`)

> Read before touching `forge.config.js`, `build/`, or `flatpak/`, or when
> rebranding or changing signing. Only non-obvious, code-verified facts — the
> code is the reference for everything else. Index: [AGENTS.md](../AGENTS.md).

- **asar must stay off**: workers are spawned by an external Bare binary from real
  file paths; asar breaks every spawn.
- The `readPackageJson` hook validates the upgrade key and runs for `start` too
  (hence fresh-clone failures); `UPGRADE_KEY` overrides the field at package time.
- `preMake` rewrites the `AppxManifest.xml` Version **in place** (dirties git;
  handles plain `x.y.z` only — prereleases produce an invalid MSIX version).
- `AppxManifest.xml`: Publisher CN must equal the signing cert's CN and stay stable
  across builds or Windows rejects OTA updates. Rebrand fields appear in several
  places; only Version is auto-synced.
- macOS signing activates only when `MAC_CODESIGN_IDENTITY` is set
  (+ `KEYCHAIN_PROFILE` for notarization). The `APPLE_*` vars in the README are
  consumed by the CI action, **not** by `forge.config.js`.
- The snap maker force-sets `base: core24`, strict confinement, name/version and
  the app command (`HelloPear --no-sandbox`) **after** merging config — overriding
  those in the `snapcraft` block is silently ignored.
- The flatpak maker emits a **tarball** consumed by `flatpak/*.yml`, whose
  URLs/sha512 are localhost placeholders; version syncs by hand in three places.
- deb/rpm/zip makers are installed but unconfigured. The prebuild plugins rename
  (not merge) darwin prebuilds and prune non-target platforms.
- `allowScripts` is a convention for allow-scripts tooling — nothing enforces it
  locally.
