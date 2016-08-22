var tls = require('tls')
var net = require('net')
var rpc = require('./rpc')
var debug = require('debug')('tunnels:client')

module.exports = function (opts) {
  var name = opts.name
  var port = opts.port
  var secure = opts.secure
  var tlsOpts = { ca: opts.ca, servername: opts.tunnelHost }
  var controlPort = opts.controlPort
  var tunnelPort = opts.tunnelPort
  var tunnelHost = opts.tunnelHost
  var rpcTimeout = opts.rpcTimeout || 3000
  var ping = opts.ping !== false

  var socket = secure
    ? tls.connect(controlPort, tunnelHost, tlsOpts, onconnect)
    : net.connect(controlPort, tunnelHost, onconnect)

  return socket

  function onconnect () {
    debug(`control connection did open`)
    var session = null
    var tunnelControl = rpc(socket)
    tunnelControl.timeout = rpcTimeout

    tunnelControl.methods.ping = cb => ping && cb()

    tunnelControl.methods.connect = cb => {
      var tunnel, local = net.connect(port, 'localhost', () => {
        debug(`local connection did open`)
        var connected = false
        tunnel = secure
          ? tls.connect(tunnelPort, tunnelHost, tlsOpts, ontunnelConnect)
          : net.connect(tunnelPort, tunnelHost, ontunnelConnect)
        function ontunnelConnect () {
          debug(`tunnel connection did open`)
          connected = true
          tunnel.pipe(local).pipe(tunnel)
          tunnel.write(session, () => cb())
        }
        tunnel.setKeepAlive(true, 55)
        tunnel.on('error', noop)
        tunnel.on('close', () => {
          debug('tunnel connection did close')
          local.destroy()
          if (!connected) {
            cb(new Error('could not open tunnel connection'))
          }
        })
      })
      local.setKeepAlive(true, 55)
      local.on('error', noop)
      local.on('close', () => {
        debug('local connection did close')
        socket.removeListener('close', oncontrolClose)
        if (tunnel) {
          tunnel.destroy()
        } else {
          cb(new Error('could not open local connection'))
        }
      })
      socket.on('close', oncontrolClose)
      function oncontrolClose () {
        local.destroy()
      }
    }

    tunnelControl.call('register', name, (err, _session, _port) => {
      if (err) return socket.emit('error', err)
      session = _session
      socket.emit('ready', _port)
    })
  }
}

function noop () {}
