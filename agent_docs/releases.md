# CI & releases (`.github/`, pear pipeline)

> Read before touching `.github/`, or when preparing a release or debugging why
> a staged release never reaches installs. Only non-obvious, code-verified
> facts — the code is the reference for everything else. Index:
> [AGENTS.md](../AGENTS.md).

- `integrate.yml`: lint only — no build, no tests. `build-release.yml`: manual
  dispatch, five per-platform jobs gated on the GitHub `release` environment
  (signing secrets live there); covers only "make distributables" — `pear build`
  and staging stay manual.
- `publish.yml` npm-publishes on any `v*` tag (what `npm version` creates) — don't
  tag unless releasing.
- Rebrand trap: CI lowercases `productName` with `tr` only, but the snap/flatpak
  makers also replace non-`[a-z0-9-]` chars — a `productName` with spaces or
  punctuation breaks the Linux jobs' artifact lookup.
- `package.json#upgrade` decides the release line — every build follows the link it
  ships with. `pear.json#multisig` derives the production key: **any edit = new
  key**.
- Keep the `pear build` Deployment Directory outside the app folder. Rollback =
  stage a higher version (no downgrade path).
- **Multisig needs ≥3 machines, not 3 keys.** `pear multisig request|verify|commit`
  all refuse unless the source drive is seeded by 2 _other_ peers
  (`SOURCE_CORE_INSUFFICIENT_PEERS`). A machine runs one sidecar, so it is one peer
  however many `pear seed` processes it starts (`pear sidecar` shuts down any
  existing one and becomes it). `--force` exists on `request` only — verify and
  commit cannot be overridden, so the release genuinely stalls until two other
  machines seed the provision link.
- `pear multisig keys get|sign` prompt for a passphrase on a **tty** — they fail with
  `invalid argument` under a pipe, so they cannot be scripted without a pty.
  `verify` and `commit` also read `pear.json` from the cwd unless given `--config`.
- Staging works from anywhere; **serving does not**. `stage` and `provision` are
  local hypercore writes, so they succeed even when no peer can reach the machine —
  the seeder then reports `firewalled: true` with `upload.totalBytes: 0` forever and
  nobody receives the release. Seed from a host with a public address or cone NAT.
