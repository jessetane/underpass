var tls = require('tls')
var net = require('net')
var rpc = require('./rpc')
var crypto = require('crypto')
var debug = require('debug')('tunnels:control-server')

module.exports = function (opts) {
  var hosts = opts.hosts
  var secure = opts.secure
  var tlsOpts = { key: opts.key, cert: opts.cert }
  var controlPort = opts.controlPort
  var externalPort = opts.externalPort

  var server = secure && secure !== 'external'
    ? tls.createServer(tlsOpts, onconnection)
    : net.createServer(onconnection)

  return server.listen(controlPort, err => {
    if (err) return server.emit('error', err)
    debug(`server listening on ${controlPort}`)
    server.emit('ready')
  })

  function onconnection (socket) {
    var address = `${socket.remoteAddress}:${socket.remotePort}`
    debug(`connection from ${address} did open`)

    var host = rpc(socket)
    host.requests = []

    host.methods.register = function (name, cb) {
      if (hosts.byName[name]) {
        cb(new Error(`host "${name}" is already registered`))
      } else {
        host.name = name
        host.session = crypto.randomBytes(16).toString('base64')
        hosts.byName[host.name] = host
        hosts.bySession[host.session] = host
        debug(`connection from ${address} registered as "${name}"`)
        cb(null, host.session, externalPort)
      }
    }

    socket.on('close', () => {
      if (host.name) {
        delete hosts.byName[host.name]
        delete hosts.bySession[host.session]
        host.requests.forEach(request => request.destroy())
        host.requests = null
        debug(`connection from ${address} registered as "${host.name}" did close`)
      } else {
        debug(`connection from ${address} did close`)
      }
    })
  }
}
