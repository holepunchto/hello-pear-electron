const fs = require('fs')
const path = require('path')
const pkg = require('./package.json')
const appName = pkg.productName ?? pkg.name
const { isWindows } = require('which-runtime')

function getElectronLocales() {
  if (process.env.ELECTRON_LOCALES === 'all') return null
  if (pkg.electronLocales === 'all') return null
  if (Array.isArray(pkg.electronLocales)) return new Set(pkg.electronLocales)
  return new Set(['en'])
}

function pruneElectronLocales(appPath) {
  const locales = getElectronLocales()
  if (locales === null) return

  const resourcesDir = path.join(
    appPath,
    'Contents',
    'Frameworks',
    'Electron Framework.framework',
    'Versions',
    'A',
    'Resources'
  )

  for (const entry of fs.readdirSync(resourcesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.endsWith('.lproj')) continue
    const locale = entry.name.slice(0, -'.lproj'.length)
    if (locales.has(locale)) continue
    fs.rmSync(path.join(resourcesDir, entry.name), { recursive: true, force: true })
  }
}

function getWindowsKitVersion() {
  const programFiles = process.env['PROGRAMFILES(X86)'] || process.env.PROGRAMFILES
  if (!programFiles) return undefined
  const kitsDir = path.join(programFiles, 'Windows Kits')
  try {
    for (const kit of fs.readdirSync(kitsDir).sort().reverse()) {
      const binDir = path.join(kitsDir, kit, 'bin')
      if (!fs.existsSync(binDir)) continue
      const version = fs
        .readdirSync(binDir)
        .filter((d) => /^\d+\.\d+\.\d+\.\d+$/.test(d))
        .sort()
        .pop()
      if (version) return version
    }
  } catch {
    return undefined
  }
}

let packagerConfig = {
  icon: 'build/icon',
  protocols: [{ name: appName, schemes: [pkg.name] }],
  derefSymlinks: true
}

if (process.env.MAC_CODESIGN_IDENTITY) {
  packagerConfig = {
    ...packagerConfig,
    osxSign: {
      identity: process.env.MAC_CODESIGN_IDENTITY,
      optionsForFile: () => ({
        entitlements: path.join(__dirname, 'build', 'entitlements.mac.plist')
      })
    },
    osxNotarize: {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    }
  }
}

module.exports = {
  packagerConfig,

  makers: [
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {}
    },
    {
      name: '@electron-forge/maker-msix',
      platforms: ['win32'],
      config: {
        appManifest: path.join(__dirname, 'build', 'AppxManifest.xml'),
        windowsKitVersion: getWindowsKitVersion(),
        ...(process.env.WINDOWS_CERTIFICATE_FILE
          ? {
              windowsSignOptions: {
                certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
                certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD
              }
            }
          : {})
      }
    }
  ],

  hooks: {
    preMake: async () => {
      fs.rmSync(path.join(__dirname, 'out', 'make'), { recursive: true, force: true })

      const manifest = path.join(__dirname, 'build', 'AppxManifest.xml')
      const msixVersion = pkg.version.replace(/^(\d+\.\d+\.\d+)$/, '$1.0')
      const xml = fs.readFileSync(manifest, 'utf-8')
      fs.writeFileSync(manifest, xml.replace(/Version="[^"]*"/, `Version="${msixVersion}"`))
    },
    postPackage: async (forgeConfig, { outputPaths, platform }) => {
      if (platform !== 'darwin') return
      for (const outputPath of outputPaths) {
        pruneElectronLocales(path.join(outputPath, `${appName}.app`))
      }
    },
    postMake: async (forgeConfig, results) => {
      for (const result of results) {
        if (result.platform !== 'win32') continue
        for (const artifact of result.artifacts) {
          if (!artifact.endsWith('.msix')) continue
          const standardDir = path.join(__dirname, 'out', `${appName}-win32-${result.arch}`)
          fs.mkdirSync(standardDir, { recursive: true })
          const dest = path.join(standardDir, path.basename(artifact))
          fs.renameSync(artifact, dest)
          result.artifacts[result.artifacts.indexOf(artifact)] = dest
        }
      }
      if (isWindows) {
        fs.rmSync(path.join(__dirname, 'out', 'make'), { recursive: true, force: true })
      }
    }
  },

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
