const { app, BrowserWindow, ipcMain } = require('electron')
const os = require('os')
const path = require('path')
const PearRuntime = require('pear-runtime')
const FramedStream = require('framed-stream')

const { isMac, isLinux, isWindows } = require('which-runtime')
const { command, flag } = require('paparam')
const pkg = require('../package.json')
const { name, productName, version, upgrade } = pkg

const protocol = name
const mainWorkerSpecifier = '/workers/main.js'

const workers = new Map()

const appName = productName ?? name

const cmd = command(
  appName,
  flag('--storage <dir>', 'pass custom storage to pear-runtime'),
  flag('--no-updates', 'start without OTA updates'),
  flag('--no-sandbox', 'start without Chromium sandbox').hide()
)

cmd.parse(app.isPackaged ? process.argv.slice(1) : process.argv.slice(2))

const pearStore = cmd.flags.storage
const updates = cmd.flags.updates

if (pearStore) app.setPath('userData', pearStore)

ipcMain.on('pkg', (evt) => {
  evt.returnValue = pkg
})

function getAppPath() {
  if (!app.isPackaged) return null
  if (isLinux && process.env.APPIMAGE) return process.env.APPIMAGE
  if (isWindows) return process.execPath
  return path.join(process.resourcesPath, '..', '..')
}

function sendToAll(name, data) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(name, data)
  }
}

function getWorker(specifier) {
  if (workers.has(specifier)) return workers.get(specifier)
  const appPath = getAppPath()
  let dir = null
  if (pearStore) {
    console.log('pear store: ' + pearStore)
    dir = pearStore
  } else if (appPath === null) {
    dir = path.join(os.tmpdir(), 'pear', appName)
  } else {
    const isSnap = !!process.env.SNAP_USER_COMMON
    const linuxConfigHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
    dir = isMac
      ? path.join(os.homedir(), 'Library', 'Application Support', appName)
      : isLinux
        ? isSnap
          ? path.join(process.env.SNAP_USER_COMMON, appName)
          : path.join(linuxConfigHome, appName)
        : path.join(os.homedir(), 'AppData', 'Roaming', appName)
  }

  const extension = isLinux ? '.AppImage' : isMac ? '.app' : '.msix'

  const worker = PearRuntime.run(require.resolve('..' + specifier), [
    updates,
    version,
    upgrade,
    productName + extension,
    dir,
    appPath
  ])
  const pipe = new FramedStream(worker)

  function sendWorkerStdout(data) {
    sendToAll('pear:worker:stdout:' + specifier, data)
  }
  function sendWorkerStderr(data) {
    sendToAll('pear:worker:stderr:' + specifier, data)
  }
  function sendWorkerIPC(data) {
    sendToAll('pear:worker:ipc:' + specifier, data)
  }
  function onBeforeQuit() {
    pipe.destroy()
  }
  ipcMain.handle('pear:worker:writeIPC:' + specifier, (evt, data) => {
    return pipe.write(data)
  })
  workers.set(specifier, pipe)
  pipe.on('data', sendWorkerIPC)
  worker.stdout.on('data', sendWorkerStdout)
  worker.stderr.on('data', sendWorkerStderr)
  worker.once('exit', (code) => {
    app.removeListener('before-quit', onBeforeQuit)
    ipcMain.removeHandler('pear:worker:writeIPC:' + specifier)
    pipe.removeListener('data', sendWorkerIPC)
    worker.stdout.removeListener('data', sendWorkerStdout)
    worker.stderr.removeListener('data', sendWorkerStderr)
    sendToAll('pear:worker:exit:' + specifier, code)
    workers.delete(specifier)
  })
  app.on('before-quit', onBeforeQuit)
  return pipe
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '..', 'electron', 'preload.js'),
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  const devServerUrl = process.env.PEAR_DEV_SERVER_URL

  if (devServerUrl) {
    await win.loadURL(devServerUrl)
    win.webContents.openDevTools()
    return
  }

  await win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
}

ipcMain.handle('pear:applyUpdate', () => {
  const pipe = getWorker(mainWorkerSpecifier)

  return new Promise((resolve, reject) => {
    function onData(data) {
      const message = data.toString()

      if (message === 'pear:updateApplied') {
        pipe.removeListener('data', onData)
        resolve()
      }
    }

    pipe.on('data', onData)
    pipe.write('pear:applyUpdate')
  })
})
ipcMain.handle('pear:startWorker', (evt, filename) => {
  getWorker(filename)
  return true
})
ipcMain.handle('app:afterUpdate', () => {
  if (isLinux && process.env.APPIMAGE) {
    app.relaunch({
      execPath: process.env.APPIMAGE,
      args: [
        '--appimage-extract-and-run',
        ...process.argv.slice(1).filter((arg) => arg !== '--appimage-extract-and-run')
      ]
    })
  } else if (!isWindows) {
    app.relaunch()
  }
  app.quit()
})

function handleDeepLink(url) {
  console.log('deep link:', url)
}

app.setAsDefaultProtocolClient(protocol)

app.on('open-url', (evt, url) => {
  evt.preventDefault()
  handleDeepLink(url)
})

const lock = app.requestSingleInstanceLock()

if (!lock) {
  app.quit()
} else {
  app.on('second-instance', (evt, args) => {
    const url = args.find((arg) => arg.startsWith(protocol + '://'))
    if (url) handleDeepLink(url)
  })

  app.whenReady().then(() => {
    createWindow().catch((err) => {
      console.error('Failed to create window:', err)
      app.quit()
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow().catch((err) => {
          console.error('Failed to create window:', err)
        })
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
