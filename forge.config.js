module.exports = {
  packagerConfig: process.env.MAC_CODESIGN_IDENTITY
    ? {
        osxSign: {
          identity: process.env.MAC_CODESIGN_IDENTITY
        },
        osxNotarize: {
          appleId: process.env.APPLE_ID,
          appleIdPassword: process.env.APPLE_PASSWORD
        }
      }
    : {},

  makers: [
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {}
    },
    {
      name: '@forkprince/electron-forge-maker-appimage',
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
