var Emitter = require('events')
var tunnelServer = require('./tunnel-server')
var controlServer = require('./control-server')
var externalServer = require('./external-server')

module.exports = function (opts) {
  var emitter = new Emitter()
  opts.on = emitter.on.bind(emitter)
  opts.removeListener = emitter.removeListener.bind(emitter)
  opts.emit = emitter.emit.bind(emitter)

  if (opts.secure) {
    if (!opts.key || !opts.cert) {
      opts.emit('error', new Error('secure mode enabled but missing key or cert'))
      return
    }
  }

  opts.hosts = {
    byName: {},
    bySession: {}
  }

  var readyCount = 3
  var openCount = 3

  // handles tunnel connections from the internal side
  opts.tunnelServer = tunnelServer(opts)
  opts.tunnelServer.on('ready', onready)

  // handles control connections from the local side
  // for name registration and new socket creation
  opts.controlServer = controlServer(opts)
  opts.controlServer.on('ready', onready)

  // handles connections from the external side
  opts.externalServer = externalServer(opts)
  opts.externalServer.on('ready', onready)

  function onready () {
    if (--readyCount > 0) return
    opts.emit('ready')
  }

  opts.close = function () {
    opts.tunnelServer.close()
    opts.controlServer.close()
    opts.externalServer.close()
  }

  opts.tunnelServer.once('close', onclose)
  opts.controlServer.once('close', onclose)
  opts.externalServer.once('close', onclose)
  function onclose () {
    if (--openCount === 0) {
      opts.emit('close')
    }
  }

  return opts
}
