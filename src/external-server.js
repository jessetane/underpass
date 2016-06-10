var tls = require('tls')
var net = require('net')
var debug = require('debug')('tunnels:external-server')

var httpNotFound = `HTTP/1.1 404 Not Found
Content-Type: text/html; charset=utf-8
Status: 404 Not Found

tunnel not found`

module.exports = function (opts) {
  var hosts = opts.hosts
  var secure = opts.secure
  var tlsOpts = { key: opts.key, cert: opts.cert }
  var externalPort = opts.externalPort

  var server = secure && secure !== 'internal'
    ? tls.createServer(tlsOpts, onconnection)
    : net.createServer(onconnection)

  return server.listen(externalPort, err => {
    if (err) return opts.emit('error', err)
    debug(`server listening on ${externalPort}`)
    server.emit('ready')
  })

  function onconnection (socket) {
    opts.connectionCount++
    var host, tunnel, address = `${socket.remoteAddress}:${socket.remotePort}`
    debug(`connection from ${address} did open`)

    socket.once('data', chunk => {
      socket.setTimeout(0)
      var string = chunk.toString()
      var match = string.match(/host: (.*)/i)
      var name, isHTTP = false
      debug(`connection from ${address} did send data ${string}`)
      if (match) {
        name = match[1].split('.')[0]
        isHTTP = true
      } else {
        string = string.split('\n')
        name = string[0]
        chunk = string.slice(1).join('\n')
      }
      host = hosts.byName[name]
      if (host) {
        debug(`connection from ${address} will request a tunnel for "${host.name}"`)
        socket.firstChunk = chunk
        host.requests.push(socket)
        host.call('connect', err => {
          if (err) {
            debug(err.message)
            handleError()
          }
        })
      } else {
        handleError()
      }

      function handleError () {
        if (isHTTP) {
          socket.end(httpNotFound)
        } else {
          socket.destroy()
        }
      }
    })

    socket.setTimeout(5000, () => {
      debug(`connection from ${address} did timeout`)
      socket.destroy()
    })

    socket.on('close', () => {
      opts.connectionCount--
      if (host) {
        if (host.requests) {
          host.requests = host.requests.filter(request => request !== socket)
        }
        debug(`connection from ${address} connected to "${host.name}" did close`)
      } else {
        debug(`connection from ${address} did close without connecting`)
      }
    })
  }
}
