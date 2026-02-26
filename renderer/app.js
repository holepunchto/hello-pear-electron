const bridge = window.bridge
const decoder = new TextDecoder('utf-8')

document.getElementById('v').innerText += bridge.pkg().version

bridge.onPearEvent('updating', () => {
  document.getElementById('v').innerText = 'UPDATING...'
})

bridge.onPearEvent('updated', () => {
  document.getElementById('v').innerText = 'Update ready!'
  const btn = document.getElementById('update-btn')
  btn.style.display = 'inline-block'
  btn.onclick = async () => {
    btn.disabled = true
    btn.innerText = 'Updating...'
    try {
      await bridge.applyUpdate()
    } catch (err) {
      document.getElementById('v').innerText = 'Update failed: ' + err.message
      btn.style.display = 'none'
    }
  }
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
  console.log('worker ipc', '[', workers.main, ']:', decoder.decode(data))

  bridge.writeWorkerIPC(workers.main, 'Hello from renderer')
})

const offWorkerExit = bridge.onWorkerExit(workers.main, (code) => {
  console.log('Worker exited with code', code)
  offWorkerStdout()
  offWorkerStderr()
  offWorkerIpc()
  offWorkerExit()
})
