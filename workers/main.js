Bare.IPC.on('data', (data) => console.log(data.toString()))

Bare.IPC.write('Hello from worker')
