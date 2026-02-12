# hello-pear-electron

> Hello World for Pear in Electron

## Requirements

- `npm`
- `pear`
- `pear-build` (npm install -g pear-build)

## Install

```sh
npm install
```

## Scripts

### `npm run start`

Start app in development mode.

```sh
npm run start
```

Uses: `electron-forge start`

---

### `npm run lint`

Check formatting and linting.

```sh
npm run lint
```

Runs:

- `prettier --check`
- `lunte`

---

### `npm run format`

Auto-format and fix lint issues.

```sh
npm run format
```

Runs:

- `prettier --write .`
- `lunte --fix`

---

### `npm run package`

Package app without creating distributables.

```sh
npm run package
```

Uses: `electron-forge package`

---

### `npm run make`

Create distributables for current platform.

```sh
npm run make
```

Uses: `electron-forge make`

---

### `npm run make:linux`

Build Linux distributables.

```sh
npm run make:linux
```

Uses: `electron-forge make --platform=linux`

---

### `npm run publish`

Publish packaged app (requires configured makers/publishers).

```sh
npm run publish
```

Uses: `electron-forge publish`

---

### Production Build

#### Upgrade Link

The `package.json` `upgrade` field should be set to a production `pear://` link.

Generate a fresh link with:

```sh
pear touch
```

This will output a pear link such as `pear://qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o`.

This link will be used throughout as a placeholder.

Set the `package.json` `upgrade` field:

```json
{
  "version": "1.0.0",
  "upgrade": "pear://qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o",
  ...
}
```

The machine that runs `pear touch` is the build machine. It is the only machine with write access.

#### Versioning

Use the `package.json` `version` field to version, using SemVer as normal.

The version **must** be bumped prior to a production build, this is relied upon to determine update in production.

```sh
npm version <v>
```

#### Make Production Distributables

##### MacOS

Production MacOS apps must be vendor signed. Supply signing and notarizing keys with `MAC_CODESIGN_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`.

```sh
MAC_CODESIGN_IDENTITY=identity APPLE_ID=id APPLE_PASSWORD=pw npm run make
```

##### Windows

TODO

##### Linux

```sh
npm run make
```

#### Build Deploy Directory

Each make runs on a different OS and architecture. Each must be moved to a single build machine,
this assumes that they've all been moved into the same project `./out` folder.

Use [`pear-build`](https://npm.im/pear-build) to move all the `package.json` and architectures into a single build target directory. The resulting directory is the Deploy Directory.

From above the project root run `pear-build` for each arch, for example Mac x64 + arm64, Linux x64 + arm64 and Windows x64 would be:

```sh
pear-build --package=./hello-pear-electron/package.json --darwin-arm64-app ./hello-pear-electron/out/HelloPear-darwin-arm64/HelloPear.app --darwin-x64-app ./hello-pear-electron/out/HelloPear-darwin-x64/HelloPear.app --linux-arm64-app ./hello-pear-electron/out/HelloPear-linux-arm64/HelloPear.AppImage --linux-x64-app ./hello-pear-electron/out/HelloPear-darwin-x64/HelloPear.AppImage --win32-x64-app ./hello-pear-electron/out/HelloPear-win32-x64/HelloPear.exe --target hello-pear-electron-1.0.0
```

If the `--target` flag is ommited, then target folder is in the current working directory named `{name}-{version}` per `package.json` fields.

Once the `<target>/by-arch` folder is hydrated with builds for all required target architectures it's ready to move on to be staged, provisioned and multisigned.

The resulting Deploy Directory should (and must) have the following structure at minimum:

```
/package.json
/by-arch
  /app
    /[...platform-arch]
```

### Stage

Use Pear to synchronize the Deploy Directory from disk to [hypercore](https://github.com/holepunchto/hypercore) within Pear by executing `pear stage <upgrade-link> <deploy-directory>`:

```sh
pear stage pear://qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o ./hello-pear-electron-1.0.0
```

This must be run on the build machine, the same machine that `pear touch` was executed on to create the `package.json` `upgrade` link.

### Seed

The build machine that ran `pear touch` and runs `pear stage` must also seed with `pear seed <upgrade-link>`:

```sh
pear seed pear://qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o # on build machine
```

Run `pear seed <upgrade-link>` on other always-online machines to reseed:

```sh
pear seed pear://qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o # on other machines
```

### Provision

TODO - needs release lines

### Multisign

TODO - needs release lines and multisig tool

### Distribution

The application distributables can be distributed per usual, eg via website etc.

The `pear install` command can also be used to install distributables peer-to-peer

```
TODO - needs pear install pear://qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o
```

### Updating the Application

- Ensure the link is seeded
- Make Production Distributables
- Build Deploy Directory
- Write (Stage / Provision / Multisign)

A running application will receive `updating` and `update` events, which are sent to the electron renderer
process via `bridge.onPearEvent()`. After receiving the `update` event, the `bridge.applyUpdate()` method is called. This swaps the current application path with a path to the updated application build and then removes the old application from disk. So once the application is restarted, the application path contains the new build, so the updated application is restarted.
