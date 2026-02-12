const bridge = window.bridge
const decoder = new TextDecoder('utf-8')

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
  console.log('worker stdout', '[', workers.main, ']:', decoder.decode(data))
})

const offWorkerStderr = bridge.onWorkerStderr(workers.main, (data) => {
  console.error('worker stderr', '[', workers.main, ']:', decoder.decode(data))
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
