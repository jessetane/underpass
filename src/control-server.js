var tls = require('tls')
var net = require('net')
var rpc = require('./rpc')
var crypto = require('crypto')
var debug = require('debug')('tunnels:control-server')

module.exports = function (opts) {
  var hosts = opts.hosts
  var secure = opts.secure
  var tlsOpts = { key: opts.key, cert: opts.cert, SNICallback: opts.SNICallback }
  var controlPort = opts.controlPort
  var externalPort = opts.externalPort
  var rpcTimeout = opts.rpcTimeout || 2500

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
    host.timeout = rpcTimeout
    host.requests = []

    host.methods.ping = cb => ping && cb()

    host.methods.register = function (name, cb) {
      var otherHost = hosts.byName[name]
      if (otherHost) {
        debug(`pinging existing registrant for "${name}"`)
        otherHost.call('ping', err => {
          if (err) {
            otherHost.socket.on('close', register)
            otherHost.socket.destroy()
          } else {
            cb(new Error(`host "${name}" is already registered`))
          }
        })
      } else {
        register()
      }

      function register () {
        host.name = name
        host.session = crypto.randomBytes(16).toString('base64')
        hosts.byName[host.name] = host
        hosts.bySession[host.session] = host
        debug(`connection from ${address} registered as "${name}"`)
        cb(null, host.session, externalPort)
      }
    }

    socket.on('error', noop)

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

function noop () {}
