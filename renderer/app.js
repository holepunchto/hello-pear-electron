const bridge = window.bridge

bridge.onPearEvent('updating', () => {
  document.getElementById('h').innerText = 'VERSION 1: Updating...'
})

bridge.onPearEvent('updated', () => {
  bridge.applyUpdate()
  document.getElementById('h').innerText = 'VERSION 1: Updated! Restart for latest'
})

const workers = {
  main: '/workers/main.js'
}

bridge.startWorker(workers.main)

const offWorkerStdout = bridge.onWorkerStdout(workers.main, (data) => {
  console.log('worker stderr', '[', workers.main, ']:', data)
})

const offWorkerStderr = bridge.onWorkerStderr(workers.main, (data) => {
  console.error('worker stderr', '[', workers.main, ']:', data)
})

const offWorkerIpc = bridge.onWorkerIPC(workers.main, (data) => {
  console.log('worker ipc', '[', workers.main, ']:', data)

  bridge.writeWorkerIPC(workers.main, 'Hello from renderer')
})

const offWorkerExit = bridge.onWorkerExit(workers.main, (code) => {
  console.log('Worker exited with code', code)
  offWorkerStdout()
  offWorkerStderr()
  offWorkerIpc()
  offWorkerExit()
})
