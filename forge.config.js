const pkg = require('./package.json')
const { isLinux } = require('which-runtime')
const appName = pkg.productName ?? pkg.name

let packagerConfig = {
  icon: 'build/icon',
  protocols: [{ name: appName, schemes: [pkg.name] }]
}

if (process.env.MAC_CODESIGN_IDENTITY) {
  packagerConfig = {
    ...packagerConfig,
    osxSign: {
      identity: process.env.MAC_CODESIGN_IDENTITY
    },
    osxNotarize: {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.TEAM_ID
    }
  }
}

const makers = {
  darwin: {
    name: '@electron-forge/maker-dmg',
    platforms: ['darwin'],
    config: {}
  },
  linux: {
    name: '@forkprince/electron-forge-maker-appimage',
    platforms: ['linux'],
    config: { template: path.resolve('build', 'AppRun') }
  }
}

if (isLinux && makers.linux?.config?.template) {
  const { executeAppBuilderAsJson } = require('app-builder-lib/out/util/appBuilder')
  require('app-builder-lib/out/util/appBuilder').executeAppBuilderAsJson = function (args) {
    args.push('--template', makers.linux.config.template)
    return executeAppBuilderAsJson.apply(this, args)
  }
}

module.exports = {
  packagerConfig,

  makers: [makers.darwin, makers.linux],

  plugins: [
    {
      name: 'electron-forge-plugin-universal-prebuilds',
      config: {}
    },
    {
      name: 'electron-forge-plugin-prune-prebuilds',
      config: {}
    }
  ]
}
