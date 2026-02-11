Bare.IPC = require('bare-sidecar/ipc') // TODO: remove when Bare.IPC lands in bare

Bare.IPC.on('data', (data) => console.log(data.toString()))

Bare.IPC.write('Hello from worker')
