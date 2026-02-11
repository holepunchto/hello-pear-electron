const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const PearRuntime = require('pear-runtime')
const { version, upgrade } = require('../package.json')

const workers = new Map()
let pear = null

function getPear() {
  if (pear) return pear
  pear = new PearRuntime({ app: getAppPath(), version, upgrade })
  return pear
}

function getAppPath() {
  if (process.cwd() !== '/') return null
  return path.join(process.resourcesPath, '..', '..')
}

function sendToAll(name, data) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(name, data)
  }
}

function getWorker(specifier) {
  if (workers.has(specifier)) return workers.get(specifier)
  const worker = getPear().run(require.resolve('..' + specifier))
  function sendWorkerStdout(data) {
    sendToAll('worker:stdout:' + specifier, data)
  }
  function sendWorkerStderr(data) {
    sendToAll('worker:stderr:' + specifier, data)
  }
  function sendWorkerIPC(data) {
    sendToAll('worker:ipc:' + specifier, data)
  }
  ipcMain.handle('worker:writeIPC:' + specifier, (evt, data) => {
    return worker.write(Buffer.from(data))
  })
  workers.set(specifier, worker)
  worker.on('data', sendWorkerIPC)
  worker.stdout.on('data', sendWorkerStdout)
  worker.stderr.on('data', sendWorkerStderr)
  worker.once('exit', (code) => {
    ipcMain.removeHandler('worker:writeIPC:' + specifier)
    worker.removeListener('data', sendWorkerIPC)
    worker.stdout.removeListener('data', sendWorkerStdout)
    worker.stderr.removeListener('data', sendWorkerStderr)
    sendToAll('worker:exit:' + specifier, code)
    worker.delete(specifier)
  })
  return worker
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

  const pear = getPear()

  const onUpdating = () => {
    if (!win.isDestroyed()) win.webContents.send('pear:event:updating')
  }

  const onUpdated = () => {
    if (!win.isDestroyed()) win.webContents.send('pear:event:updated')
  }

  pear.on('updating', onUpdating)
  pear.on('updated', onUpdated)

  win.on('closed', () => {
    pear.removeListener('updating', onUpdating)
    pear.removeListener('updated', onUpdated)
  })

  const devServerUrl = process.env.PEAR_DEV_SERVER_URL

  if (devServerUrl) {
    await win.loadURL(devServerUrl)
    win.webContents.openDevTools()
    return
  }

  await win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
}

ipcMain.handle('pear:applyUpdate', () => getPear().applyUpdate())
ipcMain.handle('pear:startWorker', (evt, filename) => {
  getWorker(filename)
  return true
})

app.whenReady().then(() => {
  createWindow().catch((error) => {
    console.error('Failed to create window:', error)
    app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch((error) => {
        console.error('Failed to create window:', error)
      })
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
