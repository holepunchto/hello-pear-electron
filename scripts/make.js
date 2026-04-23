#!/usr/bin/env node

const { spawnSync } = require('child_process')

const scripts = {
  darwin: 'make:darwin',
  linux: 'make:linux',
  win32: 'make:win32'
}

const script = scripts[process.platform]

if (!script) {
  console.error(`Unsupported platform: ${process.platform}`)
  process.exit(1)
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const result = spawnSync(npmCmd, ['run', script], { stdio: 'inherit' })

if (result.error) throw result.error
process.exit(result.status ?? 1)
