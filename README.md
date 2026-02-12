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

``sh
npm run make

````
Uses: `electron-forge make`

---

### `npm run make:linux`

Build Linux distributables.

```sh
npm run make:linux
````

Uses: `electron-forge make --platform=linux`

---

### `npm run publish`

Publish packaged app (requires configured makers/publishers).

```sh
npm run publish
```

Uses: `electron-forge publish`

---

## Build Making

```sh
npm run make
```

Outputs build into `out` dir.

### Production Build

#### Upgrade Link

The `package.json` `upgrade` field should be set to a production `pear://` link.

Generate a fresh link with:

```sh
pear touch
```

And set it in package.json `upgrade`.

#### Versioning

Use the `package.json` `version` field to version, using SemVer as normal.

The version **must** be bumped prior to a production build, this is relied upon to determine update in production.

#### Make

##### MacOS

Production MacOS apps must be vendor signed. Supply signing and notarizing keys with `MAC_CODESIGN_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`.

```sh
MAC_CODESIGN_IDENTITY=identity APPLE_ID=id APPLE_PASSWORD=pw npm run make
```

#### Windows

TODO

#### Linux

```sh
npm run make
```

#### Build

Each make runs on a different OS and architecture. Each must be moved to a single build machine, 
this assumes that they've all been moved into the same project `./out` folder.

Use [`pear-build`](https://npm.im/pear-build) to move all apps into a single `by-arch` folder,
which should then be staged along with the rest of the application.

From above the project root run `pear-build` for each arch, for example Mac ARM64 + Linux x64 would be:

```sh
pear-build --package=./hello-pear-electron/package.json --darwin-arm64-app ./hello-pear-electron/out/HelloPear-darwin-arm64/HelloPear.app --linux-x64-app ./hello-pear-electron/out/HelloPear-darwin-arm64/HelloPear.AppImage --target built-app
```

Once the `by-arch` folder is hydrated with builds for all required target architectures it's ready to move on to be staged, provisioned and multisigned.

### Production Deployment Flow

TODO

- stage
- provision
- multisig
