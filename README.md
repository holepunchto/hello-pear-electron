# hello-pear-electron

> Pear Hello World for Electron with `pear-runtime`

Quick start boilerplate for embededding [pear-runtime](https://github.com/holepunchto/pear-runtime) into Electron.

## MVP - EXPERIMENTAL

This boilerplate is MVP and Experimental.

## OS Support

- MacOS
- Linux - Work in Progress
- Windows

## Requirements

- `npm`
- `pear`
- `pear-build` (npm install -g pear-build)

## Install

```sh
npm install
```

## Scripts

### `npm start`

Start app in development mode.

```sh
npm start
```

When running locally, updates aren't turned off to avoid the built application being swapped from local development when there is an update.

To enable updates for testing update flow in local development use

```sh
npm start -- --updates
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

### `pear-runtime` module

## P2P OTA Updates

An update occurs when a seeded application drive is written to.

When an update occurs, the instance will emit two events `updating` and `updated`.

```js
pear.updater.on('updating', () => {
  // update view to indicate updating in progress
})
```

```js
pear.updater.on('updated', () => {
  // update view to indicate application updated
})
```

### Disabling Updates

Pass `--no-updates` flag to disable updates per application run.

To disable updates as an application default, ensure that the package.json is spread into the options (`{...pkg, ...}`) and set the `updates` field to `false`:

```json
{
  "version": "1.0.0",
  "updates": false
  ...
}
```

## Storage

The `dir` option defines where peer-to-peer storage should be kept.

The `pear.storage` property holds a path to application storage, this value should be passed as `Corestore` storage argument.

The `--storage` flag can be passed to use custom storage for multiple running instances. This allows for local end-to-end peer-to-peer flow.

## Workers

The idea is to put application peer-to-peer code into a main worker that then acts as a local backend for the application view layer.

```js
const IPC = pear.run('./workers/main.js', [pear.storage])
IPC.on('data', (data) => {
  console.log('data from worker', data)
})
IPC.write('hello')
```

The `workers/main.js` would then be executed with an embedded Bare runtime.

The other side of the IPC stream can be accessed inside the worker as `Bare.IPC`.

Note how `pear.storage` is passed in as a the first arguments, this can be accessed via `Bare.argv[2]`.

```js
const Corestore = require('corestore')
const storage = Bare.argv[2]

Bare.IPC.on('data', (data) => console.log(data.toString()))

Bare.IPC.write('Hello from worker')

const corestore = new Corestore(storage)
//.. do more with corestore..
```

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

##### Checklist

- `package.json` `author` field populated
- `package.json` `license` field populated
- `package.json` `description` field populated
- `package.json` `author` field populated
- `package.json` `name` field set per brand
- `package.json` `productName` field set per brand
- `build/icon.icns` is per brand
- `build/icon.ico` is per brand
- `build/icon.icon.png` is per brand

##### MacOS

Production MacOS apps must be vendor signed and notarized.

NOTE: If using pear <= v2.2.15 then `{ "pear": {"stage": {"includes": [".github"] } } }` must be assed to the project `package.json`, otherwise stray .github folders in the dependency tree are stripped during stage and the notarized build will fail to run due to lack of signature verification caused by pear <= v2.2.15 pruning these folders during stage.

Supply signing and notarizing keys with `MAC_CODESIGN_IDENTITY`, `APPLE_TEAM_ID`, `APPLE_ID`, `APPLE_PASSWORD`

```sh
MAC_CODESIGN_IDENTITY=identity APPLE_TEAM_ID=teamid APPLE_ID=id APPLE_PASSWORD=pw npm run make
```

Instructions for obtaining credentials can be found [here](https://www.electronforge.io/guides/code-signing/code-signing-macos#option-1-using-an-app-specific-password)

Note `APPLE_PASSWORD` is not the sign-in password, it's an [app-specific password](https://support.apple.com/en-us/102654).

##### Windows

Production Windows apps must be signed with a code signing certificate.

Supply a `.pfx` certificate file and password with `WINDOWS_CERTIFICATE_FILE` and `WINDOWS_CERTIFICATE_PASSWORD`:

```sh
WINDOWS_CERTIFICATE_FILE=path/to/cert.pfx WINDOWS_CERTIFICATE_PASSWORD=password npm run make
```

The `Publisher` field in `build/AppxManifest.xml` must match the `CN` of the signing certificate. For example, if the certificate subject is `CN=My Company`, set `Publisher="CN=My Company"` in the manifest.

Without signing credentials, a self-signed development certificate is automatically generated matching the `Publisher` in `AppxManifest.xml`. This certificate is cached in the local certificate store and reused across builds on the same machine, but is not portable — building on a different machine or clearing the cert store generates a new one.

Edit `build/AppxManifest.xml` and ensure name, publisher, description, and executable path are correct throughout - some of these are declared in multiple locations.

###### Persistent Certificate for OTA Updates

OTA updates require the same certificate across builds — Windows rejects updates where the publisher doesn't match the installed package. Create a persistent code signing certificate following [Microsoft's MSIX signing guide](https://learn.microsoft.com/en-us/windows/msix/package/create-certificate-package-signing), or use a production certificate.

Export the certificate to a `.pfx` file, trust it locally by importing it to `Cert:\LocalMachine\TrustedPeople` (requires admin), and update `Publisher` in `build/AppxManifest.xml` to match the certificate CN.

Then build with:

```powershell
$env:WINDOWS_CERTIFICATE_FILE = (Resolve-Path ".\cert.pfx").Path
$env:WINDOWS_CERTIFICATE_PASSWORD = "password"
npm run make
```

Install with `Add-AppxPackage .\out\make\msix\x64\HelloPear.msix`, uninstall with `Get-AppxPackage -Name HelloPear | Remove-AppxPackage`.

When testing OTA updates, both the installed base and the update MSIX must be signed with the same certificate (`Publisher` must match), otherwise Windows silently rejects the update.

##### Linux

NOTE: linux AppImage builds must currently be run with the `--no-sandbox` flag

```sh
npm run make
```

#### Build Deploy Directory

Each make runs on a different OS and architecture. Each must be moved to a single build machine,
this assumes that they've all been moved into the same project `./out` folder.

Use [`pear-build`](https://npm.im/pear-build) to move all the `package.json` and architectures into a single build target directory. The resulting directory is the Deploy Directory.

From above the project root run `pear-build` for each arch, for example Mac x64 + arm64, Linux x64 + arm64 and Windows x64 would be:

```sh
pear-build --package=./hello-pear-electron/package.json --darwin-arm64-app ./hello-pear-electron/out/HelloPear-darwin-arm64/HelloPear.app --darwin-x64-app ./hello-pear-electron/out/HelloPear-darwin-x64/HelloPear.app --linux-arm64-app ./hello-pear-electron/out/HelloPear-linux-arm64/HelloPear.AppImage --linux-x64-app ./hello-pear-electron/out/HelloPear-darwin-x64/HelloPear.AppImage --win32-x64-app ./hello-pear-electron/out/make/msix/x64/HelloPear.msix --target hello-pear-electron-1.0.0
```

If the `--target` flag is ommited, then target folder is in the current working directory named `{name}-{version}` per `package.json` fields.

Once the `<target>/by-arch` folder is hydrated with builds for all required target architectures it's ready to move on to be staged, provisioned and multisigned.

The resulting Deploy Directory should (and must) have the following structure at minimum:

```
/package.json
/by-arch
  /[...platform-arch]
    /app
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

Iterating on code leads to lots of additions and deletions. When staging, both additions and deletions are entries written to an application drive. A provision synchronizes blocks from one application drive to another which effectively strips intermediate additions/deletions. Use `pear provision` to create a pre-production application drive.

Create a target provision link:

```sh
pear touch
```

The signature of `pear provision` is:

```sh
provision <versioned-source-link> <target-link> <versioned-production-link>
```

The source link is the stage link. It's a versioned link when the `pear://<fork>.<length>.<key>` format is used. For example: `pear://0.1079.qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o`

Let's say the output of `pear touch` is `pear://q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o`. This is the target link. It should not be versioned, it's going to have blocks synced to it from the source link.

The `pear provision` command expects a versioned production link to synchronize onto the target link before then synchronizing from the source link so that changes from the source link are layered on top of a production replica.

The production link should be a multisigned link that never changes but the multisigned link should also originate from a provisioned link. Prior to go-live a provisioned link may be used internally as the pre-production stand-in link.

So to bootstrap this flow the first time, supply the target link versioned with 0.0 as the production link:

```sh
pear provision pear://0.1079.qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o pear://q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o pear://0.0.q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o
```

Say `pear://q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o` becomes a pre-golive pre-production production stand-in link. Subsequent provisions would use this as the production link.

For example `pear touch` returns `pear://ahzao41564w6fbbh5oxy47zungwyp7bgb1ctwtz3i4j5fbqdayxy`, this is now the new target link:

```sh
pear provision pear://0.2081.qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o pear://ahzao41564w6fbbh5oxy47zungwyp7bgb1ctwtz3i4j5fbqdayxy pear://0.1079.q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o
```

Here the first touched link has become the production link stand-in, the second touched link is now the provision link. This decoupling allows for as many provision links as needed while keeping the production (or production stand-in) link stable. See the next Multisign section for creating a final production link for go-live.

Once any new key is ready, the application can be updated to that key by setting the `package.json` `upgrade` field, for example to move from stage link to pre-production provision link:

```json
{
  "version": "1.2.3",
  "upgrade": "pear://q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o",
  ....
}
```

### Multisig

Multisig serves a dual security purpose:

- Multiple people need to get hacked before a malicious build can be published
- Multiple people need to lose their signing key before a production build can no longer be updated

It also provides flexibility, by decoupling the key of a production build from the machine where it is built. Instead, the key of a multisig built is fully determined by a `namespace` (an arbitrary string), a list of signing keys, and a quorum (the amount of signers needed to release a build).

#### Create Signing Keys

Each signer needs to generate a signing key. The same person can use the same key to sign many different builds.

```
npm i -g hypercore-sign
hypercore-sign-generate-keys
```

Take note of the public key.

#### Create Multisig Config

```json
{
  "publicKeys": ["pubkey-signer-1", "pubkey-signer-2", "pubkey-signer-3"],
  "namespace": "hello-pear-electron",
  "quorum": 2,
  "srcKey": "q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o"
}
```

This is an example multisig config file for this app, using the pre-production key defined before as the source of the content to mirror into the multisig drive. Store it as `multisig.json`.

#### Prepare Multisig Request

```
npm i -g hyper-multisig-cli
```

```
hyper-multisig request-drive <length>
```

Where `<length>` is the current length of the pre-production key. This will return a signing request.

Note: hyper-multisig performs several checks before requesting and committing multisig requests, to protect against accidentally corrupting the production build.

One of the checks ensures the source drive is healthily seeded. If this is not the case, `hyper-multisig` refuses to make the signing request. Solve it by adding the pre-production key to some blind peers (or getting it seeded in other ways).

#### Sign Multisig Request

`hyper-multisig` offers protection from formal mistakes that corrupt the production build, but it is up to the signers to verify that they are signing the correct build.

To check for formal mistakes before signing, run the `hyper-multisig verify-drive` command (next section). Do not sign a build when it fails those checks.

To sign a request, run

```
hypercore-sign <signing request>
```

Then share the response. Once a quorum of signers (2 in the example) share their response, the build is ready to go out.

#### Verify Multisig Request

```
hyper-multisig verify-drive --first-commit <signing request>
```

If responses are already available, pass those in as additional parameters after the `<signing request>`.

#### Commit Multisig Request

Only run the commit after verifying the request and all responses. Never abort a commit while it is running. If a commit does get aborted while running, run the commit again as soon as possible, since the production build is then stuck in an intermediate state.

Note: it does not matter om which machine the commit is run. So in case of a computer crash, just ask someone else to run the commit. It need not be a signer: the request and the responses suffice to generate the build. This is the reason why hyper-multisig verifies that the source drive is well seeded (it is downloaded as part of the signing process).

```
hyper-multisig commit-drive --first-commit <signing request>
```

This is the first commit, so the multisig hyperdrive is created now. The commit is not safely finished until that drive's key is seeded by blind peers (or other seeder services).

The logs indicate when to do this:

```
Committing the core...
Committed the core (key <target key>)
Waiting for remote seeders to pick up the changes...
Please add this key to the seeders now. The logs here will notify you when it is picked up by them. Do not shut down until that happens.
```

Once the program detects at least 2 seeders have fully downloaded the multisig drive, it is safe to shut it down (ctrl-c).

#### More Multisig Requests

Use the same flow for the next multisig requests, but remove the `--first-commit` flag.

Starting from the second commit, it is technically possible to corrupt the production build. So if a command ever errors with an `INCOMPATIBLE_SOURCE_AND_TARGET` error, never try to work around it, but thank the tool for protecting you from doing something stupid.

The only safe way to proceed is by creating a new pre-production key.

### Distribute

The application distributables can be distributed per usual, eg via website etc.

The `pear install` command can also be used to install distributables peer-to-peer

```
TODO - needs pear install pear://qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o
```

### Application Update Flow

- Ensure the link is seeded
- Make Production Distributables
- Build Deploy Directory
- Write (Stage / Provision / Multisign)

A running application will receive `updating` and `update` events, which are sent to the electron renderer
process via `bridge.onPearEvent()`. After receiving the `update` event, the `bridge.applyUpdate()` method is called. This swaps the current application path with a path to the updated application build and then removes the old application from disk. So once the application is restarted, the application path contains the new build therefore the updated application is executed on restart.

### Storage & Additional Application Instances

A storage dir is used for persistence. In development this defaults to `<tmpdir>/pear/<name>`.

In Production this is per OS:

- Mac: `~/Library/Application Support/<name>`
- Linux: `~/.config/<name>`
- Windows: `%USERPROFILE%\AppData\Local\<name>`

Additionally an argument can be passed to set a custom storage path.

This is just boilerplate, a conventional starting point. It can be changed/improved as needed per project.
For example, peer-to-peer applications can use a lot of disk space. On Windows the `C:` drive is often lower capacity than other drives. Allowing users to set their storage in-app is beyond the scope here but would be a useful feature for any peer-to-peer app.

In development custom storage can be passed as so:

```sh
npm start -- --storage /tmp/custom/storage
```

For application builds, an additional instance can be run with the following per OS.

#### MacOS

```sh
open -n <name>.app --args --storage /tmp/custom/storage
```

#### Linux

```sh
./<name>.AppImage --storage /tmp/custom/storage
```

#### Windows

```sh
.\<name>.exe --storage C:\tmp\custom\storage
```
