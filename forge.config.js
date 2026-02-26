const pkg = require('./package.json')
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

module.exports = {
  packagerConfig,
  hooks: {
    packageAfterCopy: async (forgeConfig, buildPath) => {
      if (process.platform === 'linux') {
        const path = await import('path')
        const fs = await import('fs')
        const customAppRun = path.resolve('build', 'linux', 'AppRun')
        const targetPath = path.join(buildPath, '..', '..', 'AppRun')
        fs.copyFileSync(customAppRun, targetPath)
      }
    }
  },
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {}
    },
    {
      name: 'electron-forge-maker-appimage',
      platforms: ['linux']
    }
  ],

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
