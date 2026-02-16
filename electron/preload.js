const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('bridge', {
  pkg() {
    return ipcRenderer.sendSync('pkg')
  },
  applyUpdate: () => ipcRenderer.invoke('pear:applyUpdate'),
  onPearEvent: (name, listener) => {
    const wrap = (evt, eventName) => listener(eventName)
    ipcRenderer.on('pear:event:' + name, wrap)
    return () => ipcRenderer.removeListener('pear:event:' + name, wrap)
  },
  startWorker: (specifier) => ipcRenderer.invoke('pear:startWorker', specifier),
  onWorkerStdout: (specifier, listener) => {
    const wrap = (evt, data) => listener(Buffer.from(data))
    ipcRenderer.on('pear:worker:stdout:' + specifier, wrap)
    return () => ipcRenderer.removeListener('pear:worker:stdout:' + specifier, wrap)
  },
  onWorkerStderr: (specifier, listener) => {
    const wrap = (evt, data) => listener(Buffer.from(data))
    ipcRenderer.on('pear:worker:stderr:' + specifier, wrap)
    return () => ipcRenderer.removeListener('pear:worker:stderr:' + specifier, wrap)
  },
  onWorkerIPC: (specifier, listener) => {
    const wrap = (evt, data) => listener(Buffer.from(data))
    ipcRenderer.on('pear:worker:ipc:' + specifier, wrap)
    return () => ipcRenderer.removeListener('pear:worker:ipc:' + specifier, wrap)
  },
  onWorkerExit: (specifier, listener) => {
    const wrap = (evt, data) => listener(Buffer.from(data))
    ipcRenderer.on('pear:worker:exit:' + specifier, wrap)
    return () => ipcRenderer.removeListener('pear:worker:exit:' + specifier, wrap)
  },
  writeWorkerIPC: (specifier, data) => {
    return ipcRenderer.invoke('pear:worker:writeIPC:' + specifier, data)
  }
})
