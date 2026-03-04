# hello-pear-electron

> Pear Hello World for Electron with `pear-runtime`

Quick start boilerplate for embededding [pear-runtime](https://github.com/holepunchto/pear-runtime) into Electron.

## MVP - EXPERIMENTAL

This boilerplate is MVP and Experimental.

## OS Support

- MacOS
- Linux - Work in Progress
- Windows - Work in Progress

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

### Peer-to-Peer Deployments

Use the `pear` CLI to deploy applications.

There are different phases of deployment

- staged - internal usage, local checks, checks between devs
- provisioned - preproduction, QA, unsigned releases
- multisigged - production, cryptographically signed by stakeholders

Apps in each phase are represented by a [pear:// link](https://github.com/holepunchto/pear-link?tab=readme-ov-file#pear-link-format) and each phase feeds into the next. A staged link is the source for a provisioned link, a provisioned link is the source for a multisigged link.

Each of these phases fully support P2P OTA updates.

#### Terminology

- application drive - the [Hyperdrive](https://github.com/holepunchto/hyperdrive) behind a Pear application
- pear link - a [link format][https://github.com/holepunchto/pear-link?tab=readme-ov-file#pear-link-format] for self-describing peer-to-peer links
- versioned link - a pear link of the form `pear://<fork>.<length>.<key>` where fork, length and key correspond to [core.fork](https://github.com/holepunchto/hypercore#corefork), [core.length](https://github.com/holepunchto/hypercore#corelength), and [core.key](https://github.com/holepunchto/hypercore?tab=readme-ov-file#corekey) of the [Hypercore](https://github.com/holepunchto/hypercore) behind the [Hyperdrive](https://github.com/holepunchto/hyperdrive) behind the Pear application

#### 0. Touch and Seed

Create a new pear link:

```sh
pear touch
```

This will output a link, for example: `pear://qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o`. This link will be used throughout as a placeholder.

Then seed it with `pear seed <link>`, for example:

```sh
pear seed pear://qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o # on build machine
```

On other always-online machines reseed with:

```sh
pear seed pear://qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o # on other machines
```

#### 1. Set upgrade link

The `package.json` `upgrade` field should be set to a production `pear://` link.

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

To set the upgrade link from the command line `npm set pkg upgrade=<link>` can be used:

```sh
npm set pkg upgrade=pear://qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o
```

#### 2. Version

If this is first time leave the version at 1.0.0 and skip to Make distributables.

Use the `package.json` `version` field to set the version.

For an update to work, the version **must** be bumped.

The `npm version` command can be used to set the version.

```sh
npm version [<newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease]
```

For example:

```sh
npm version patch
```

#### 3. Make Distributables

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

For development or internal usage:

```sh
npm run make
```

Production MacOS apps must be vendor signed and notarized.

NOTE: If using pear <= v2.2.15 then `{ "pear": {"stage": {"includes": [".github"] } } }` must be assed to the project `package.json`, otherwise stray .github folders in the dependency tree are stripped during stage and the notarized build will fail to run due to lack of signature verification caused by pear <= v2.2.15 pruning these folders during stage.

Supply signing and notarizing keys with `MAC_CODESIGN_IDENTITY`, `APPLE_TEAM_ID`, `APPLE_ID`, `APPLE_PASSWORD`

```sh
MAC_CODESIGN_IDENTITY=identity APPLE_TEAM_ID=teamid APPLE_ID=id APPLE_PASSWORD=pw npm run make
```

Instructions for obtaining credentials can be found [here](https://www.electronforge.io/guides/code-signing/code-signing-macos#option-1-using-an-app-specific-password)

Note `APPLE_PASSWORD` is not the sign-in password, it's an [app-specific password](https://support.apple.com/en-us/102654).

##### Windows

TODO

##### Linux

NOTE: linux AppImage builds must currently be run with the `--no-sandbox` flag

```sh
npm run make
```

#### 4. Build Deploy Directory

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
  /[...platform-arch]
    /app
```

### 5. Stage

Use Pear to synchronize the Deploy Directory from disk to [hypercore](https://github.com/holepunchto/hypercore) within Pear by executing `pear stage <upgrade-link> <deploy-directory>`:

```sh
pear stage pear://qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o ./hello-pear-electron-1.0.0
```

This completes first-phase deployment.

#### 5a. Confirm Updating with Stage

Open the application on multiple different machines - the seeding process from [0. Touch and Seed](#0-touch-and-seed) should show peers joining as application instances are opened per machine.

Make a change, save it and repeat steps:

- [2. Version](#2-version) (do `npm version patch`)
- [3. Make Distributables](#3-make-distributables)
- [4. Build Deploy Directory](#4-build-deploy-directory)

Then:

```sh
pear provision pear://0.1079.qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o pear://q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o pear://0.0.q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o
```

```sh
pear stage pear://qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o ./hello-pear-electron-1.0.1
```

As long as the `upgrade` field is pointing to the staged link, then this should trigger an update in every application on every machine it was run on, if so the steps were completed succesfully. Restart the application to see the latest update.

### 6. Provision

With `pear stage` both additions and deletions are appended to the application drive. When productionizing an application, removing history and overhead is an important step. A provision synchronizes from another pear:// link in a way that strips additions/deletions resulting in a smaller data footprint.

Use `pear provision` to create a production-ready application drive.

The signature of `pear provision` is:

```sh
pear provision <versioned-source-link> <target-link> <versioned-production-link>
```

A versioned link takes the form `pear://<fork>.<length>.<key>`.

A provision synchronizes from the versioned production link onto the target link, and then synchronizes from the versioned source link onto the target link.

The source link would be a prior staged application, for example: `pear://0.1079.qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o`.

The target link needs to be created and seeded, follow step:

- [0. Touch and Seed](#0-touch-and-seed)

Provisioning reseeding the provision on other can.

```sh
pear provision pear://0.1079.qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o pear://q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o pear://0.0.q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o
```

The `package.json` `upgrade` field determines where the app updates from, so to check that the provisioned link works it must be set to the provisioned link.

- [1. Set upgrade link](#1-set-upgrade-link)

Since this an update, it should be versioned:

- [2. Version](#2-version)

The source link for the provisioned drive has to be updated with the new `package.json` `upgrade` field pointing to the provisioned link.

Make a new build that contains the new `package.json` with the new `upgrade` field, following steps:

- [3. Make Distributables](#3-make-distributables)
- [4. Build Deploy Directory](#4-build-deploy-directory)

Stage again to the stage link, following:

- [5. Stage](#5-stage) (excluding 5a)

Now provision again so that the `upgrade` link is set correctly on the provisioned link:

```sh
pear provision pear://0.1080.qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o pear://q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o pear://0.0.q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o
```

#### 6a. Confirm Updating with Provision

To update with provision, first update by staging, following:

- [5a. Confirm Updating with Stage](#5a-confirm-updating-with-stage)

Then provision:

```sh
pear provision pear://0.1081.qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o pear://q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o pear://0.0.q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o
```

As long as the `upgrade` field is pointing to the provisioned link, then this should trigger an update in every application on every machine it was run on, if so the steps were completed succesfully. Restart the application to see the latest update.

### 7. Multisig

A multisigged application drive is recommendeded for serious production deployment.

A quoruom is the amount of signers needed to release a build.

Requring a quorom of signers before a release can go out distributes production risk.

A malicious build cannot be published without multiple signers being compromised, enough signers to establish quorom.

Multiple signers, enough to break quorom would have to lose their signing keys to be unable to update a production build.

A multisigged application drive is not machine-bound. Write access is determined by signing capability.

A multisig key is defined by a `namespace` (an arbitrary string), a list of signing keys, and a quorum.

To setup a new key follow:

- [7a. Create Signing Keys](#7a-create-signing-keys)
- [7b. Create Multisig Config](#7b-create-multisig-config)
- [7c. Set `upgrade` field to Multisig Link](#7b-set-upgrade-field-to-multisig-link)
- [7d. Prepare Multisig Request](#7d-prepare-multisig-request)
- [7e. Sign](#7e-sign)
- [7f. Verify](#7f-verify)
- [7g. Commit](#7g-commit)

To make a multisig request on an existing drive follow:

- [7c. Prepare Multisig Request](#7c-prepare-multisig-request)
- [7d. Sign](#7d-sign)
- [7e. Verify](#7e-verify)
- [7f. Commit](#7f-commit)

#### 7a. Create Signing Keys

Each signer needs to generate a signing key.

The same person can use the same key to sign many different builds.

```
npm i -g hypercore-sign
hypercore-sign-generate-keys
```

Take note of the public key.

#### 7b. Create Multisig Config

Set the public keys of each signer on `publicKey` and use the key of the provision link as the `srcKey`:

```json
{
  "publicKeys": ["pubkey-signer-1", "pubkey-signer-2", "pubkey-signer-3"],
  "namespace": "hello-pear-electron",
  "quorum": 2,
  "srcKey": "q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o"
}
```

This configuration has three signers with a quorom of 2. Which means two signers out of three can trigger a production release.

Store it as `multisig.json`.

#### 7c. Set `upgrade` field to Multisig Link

```
npm i -g hyper-multisig-cli
```

In the current working directory as `multisig.json` run the following to get the multisig link:

```js
hyper-multisig link
```

This will output a pear link, example: `pear://69qwbihxj4c8te15wt3skj4j1g3ufmbo3mperedjqr1hb55mspoo`.

Then update the `upgrade` field of the `package.json` to the multisig link.

- [1. Set upgrade link](#1-set-upgrade-link)

The `upgrade` link now points to an appropriate production multisigged application drive.

Go through the update flow steps:

- [2. Version](#2-version)
- [3. Make Distributables](#3-make-distributables)
- [4. Build Deploy Directory](#4-build-deploy-directory)
- [5. Stage](#5-stage) (excluding 5a)

When provisioning, the production link argument should be the multisig link, for example:

```sh
pear provision pear://0.1082.qxenz5wmspmryjc13m9yzsqj1conqotn8fb4ocbufwtz9mtbqq5o pear://q9sopzoqgas9usoiq7uzkkwngm5pzj4zo3n4esjwwbmw6offis8o pear://0.0.69qwbihxj4c8te15wt3skj4j1g3ufmbo3mperedjqr1hb55mspoo
```

- [6. Provision](#6-provision) (excluding 6a)

The `upgrade` field in the source drive (the provision drive) now points to the multisigged application drive.

#### 7d. Prepare Multisig Request

```
hyper-multisig request <length>
```

Where `<length>` is the current length of the provision key. This will return a signing request.

Note: `hyper-multisig` performs several checks before requesting and committing multisig requests, to protect against accidentally corrupting the production build.

One of the checks ensures the source drive is healthily seeded. If this is not the case, `hyper-multisig` refuses to make the signing request. Solve it by reseeding the provision on other peers.

#### 7e. Sign

`hyper-multisig` offers protection from formal mistakes that corrupt the production build, but it is up to the signers to verify that they are signing the correct build.

To check for formal mistakes before signing, run the `hyper-multisig verify` command (next section). Do not sign a build when it fails those checks.

To sign a request, run

```
hypercore-sign <signing request>
```

Then share the response. Once a quorum of signers (2 in the example) share their response, the build is ready to go out.

#### 7f. Verify

```
hyper-multisig verify [--first-commit] <signing request>
```

Use the `--first-commit` flag if this is the first commit to this drive.

If responses are already available, pass those in as additional parameters after the `<signing request>`.

#### 7g. Commit

Only commit after verifying the request and all responses.

```
hyper-multisig commit [--first-commit] <signing request>
```

Use the `--first-commit` flag if this is the first commit to this drive.

The commit is not safely finished until that drive's key is seeded by peers.

The logs indicate when to verify reseeding:

```
Committing the core...
Committed the core (key <target key>)
Waiting for remote seeders to pick up the changes...
Please add this key to the seeders now. The logs here will notify you when it is picked up by them. Do not shut down until that happens.
```

Once the program detects at least 2 seeders have fully downloaded the multisig drive, it is safe to shut it down (ctrl-c).

Never abort a commit while it is running. If a commit does get aborted while running, run the commit again as soon as possible, since the production build is then stuck in an intermediate state.

It does not matter om which machine the commit is run. So in case of a computer crash, just ask someone else to run the commit.

It need not be a signer who commits as the request and the responses suffice to generate the build. This is the reason why `hyper-multisig` verifies that the source drive is well seeded.

Note: starting from the second commit, it is technically possible to corrupt the production build. So if a command ever errors with an `INCOMPATIBLE_SOURCE_AND_TARGET` error, never try to work around it, the only safe way to proceed is by creating reseeding the provision on other peers.

### Build Lines

Create a build that points to the stage link and a build that points to the provision link.

- [1. Set upgrade link](#1-set-upgrade-link)
- [3. Make Distributables](#3-make-distributables)
- [4. Build Deploy Directory](#4-build-deploy-directory)

Share the stage build with developer collaborators.

Share the provision build with stakeholders, especially signers.

Any updates to the stage or provision links will then update in the dedicated application builds.

### Delivery Pipeline

Once fully setup, the delivery pipeline is always: Stage -> Provision -> Multisig.

An update will not occur unless the `package.json` is `version` is updated.

Always start by updating the version:

- [2. Version](#2-version)

Iterate as much as needed and continually stage.

- [5. Stage](#5-stage)

Once application is considered stable move on to provision.

- [6. Provision](#6-provision)

Once stakeholders, QA, dogfooder devs and any one else relevant has confirmed stability then multisig the provision key.

- [7c. Prepare Multisig Request](#7c-prepare-multisig-request)
- [7d. Sign](#7d-sign)
- [7e. Verify](#7e-verify)
- [7f. Commit](#7f-commit)

### Custom builds

The `upgrade` field can be set to one link only. Share alternative builds internally peer-to-peer by forking, creating a custom stage link, seeding, building and sharing custom staged builds with developer collaborators.

- [0. Touch and Seed](#0-touch-and-seed)
- [1. Set upgrade link](#1-set-upgrade-link)
- [2. Version](#2-version)
- [3. Make Distributables](#3-make-distributables)
- [4. Build Deploy Directory](#4-build-deploy-directory)
- [5. Stage](#5-stage)

### Internal Lines

Depending on team scale, it can be worth having three stage drives, one provision drive and one multisig drive

- development - staged for developer team experimentation
- staging - staged for wider developer and technical stakeholders, more stable than development,
- rc - staged release candidate, ultra stable
- prerelease - provisioned from rc source
- production - multisigged from prerelease source

For each of these lines:

- [1. Set upgrade link](#1-set-upgrade-link)
- [3. Make Distributables](#3-make-distributables)

### Runtime Update Flow

A running application will receive `updating` and `update` events, which are sent to the electron renderer
process via `bridge.onPearEvent()`. After receiving the `update` event, the `bridge.applyUpdate()` method is called. This swaps the current application path with a path to the updated application build and then removes the old application from disk. So once the application is restarted, the application path contains the new build therefore the updated application is executed on restart.

### Runtime Storage & Additional Application Instances

A storage dir is used for persistence. In development this defaults to `<tmpdir>/pear/<name>`.

In Production this is per OS:

- Mac: `~/Library/Application Support/<name>`
- Linux: `~/.config/<name>`
- Windows: `C:\\%USERPROFILE%\\AppData\\Local\\<name>`

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

### Recovering from losing keys

Staged and provisioned drives are machine-bound. If data is lost, write access to those keys is lost.

Multisig drives are not machine-bound.

If a stage link is lost, just create a new link and stage to it - update the stage builds.

If a provision key is lost, make a new one using production as the source:

```sh
pear provision <versioned-production-key> <target-key> <versioned-production-key>
```

Then provision to the new prerelease key with stage key as source.

```sh
pear provision <versioned-stage-key> <target-key> <versioned-production-key>
```

Then set the new provision link key as the `srcKey` of the `multisig.json`config.

- [7b. Create Multisig Config](#7b-create-multisig-config)
