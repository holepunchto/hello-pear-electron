const PearRuntime = require('pear-runtime')
const Hyperswarm = require('hyperswarm')
const Corestore = require('corestore')
const goodbye = require('graceful-goodbye')
const path = require('bare-path')

const updaterConfig = JSON.parse(Bare.argv[2])

const store = new Corestore(path.join(updaterConfig.dir, 'pear-runtime/corestore'))
const swarm = new Hyperswarm()
const pear = new PearRuntime({ ...updaterConfig, swarm, store })
pear.on('error', console.log)
if (updaterConfig.updates !== false) {
  swarm.on('connection', (connection) => store.replicate(connection))
  swarm.join(pear.updater.drive.core.discoveryKey, {
    client: true,
    server: false
  })
}

pear.updater.on('updating', () => Bare.IPC.write('updating'))
pear.updater.on('updated', () => Bare.IPC.write('updated'))

goodbye(async () => {
  await swarm.destroy()
  await pear.close()
  await store.close()
})

Bare.IPC.on('data', (data) => {
  const string = data.toString()
  if (string === 'pear:applyUpdate') pear.updater.applyUpdate()
  else console.log(string)
})

Bare.IPC.write('Hello from worker')
