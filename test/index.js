var tape = require('tape')
var fs = require('fs')
var net = require('net')
var tls = require('tls')
var http = require('http')
var https = require('https')
var spawn = require('child_process').spawn
var createClient = require('../src/client')
var createServer = require('../src/server')

var key = fs.readFileSync(__dirname + '/key.pem')
var cert = fs.readFileSync(__dirname + '/cert.pem')
var ca = cert

tape('plain tcp', t => {
  t.plan(1)

  var server = createServer({
    tunnelPort: '9000',
    controlPort: '9001',
    externalPort: '9002',
  })

  var internal = net.createServer(socket => {
    socket.on('data', d => socket.write(d.toString().toUpperCase()))
  }).listen('8080')

  var client = createClient({
    tunnelHost: 'localhost',
    tunnelPort: '9000',
    controlPort: '9001',
    name: 'test',
    port: '8080',
  })

  client.on('ready', () => {
    var external = net.connect('9002', 'localhost')
    external.on('data', d => {
      t.equal(d.toString(), 'HI')
      external.destroy()
      client.destroy()
      internal.close()
      server.close()
    })
    external.write('test\nhi')
  })
})

tape('plain tcp (secure)', t => {
  t.plan(1)

  var server = createServer({
    tunnelPort: '9000',
    controlPort: '9001',
    externalPort: '9002',
    secure: true,
    cert,
    key,
  })

  var internal = net.createServer(socket => {
    socket.on('data', d => socket.write(d.toString().toUpperCase()))
  }).listen('8080')

  var client = createClient({
    tunnelHost: 'localhost',
    tunnelPort: '9000',
    controlPort: '9001',
    name: 'test',
    port: '8080',
    secure: true,
    ca,
  })

  client.on('ready', () => {
    var external = tls.connect('9002', 'localhost', { ca })
    external.on('data', d => {
      t.equal(d.toString(), 'HI')
      external.destroy()
      client.destroy()
      internal.close()
      server.close()
    })
    external.write('test\nhi')
  })
})

tape('plain tcp (secure external only)', t => {
  t.plan(1)

  var server = createServer({
    tunnelPort: '9000',
    controlPort: '9001',
    externalPort: '9002',
    secure: 'external',
    cert,
    key,
  })

  var internal = net.createServer(socket => {
    socket.on('data', d => socket.write(d.toString().toUpperCase()))
  }).listen('8080')

  var client = createClient({
    tunnelHost: 'localhost',
    tunnelPort: '9000',
    controlPort: '9001',
    name: 'test',
    port: '8080',
  })

  client.on('ready', () => {
    var external = tls.connect('9002', 'localhost', { ca })
    external.on('data', d => {
      t.equal(d.toString(), 'HI')
      external.destroy()
      client.destroy()
      internal.close()
      server.close()
    })
    external.write('test\nhi')
  })
})

tape('plain tcp (secure internal only)', t => {
  t.plan(1)

  var server = createServer({
    tunnelPort: '9000',
    controlPort: '9001',
    externalPort: '9002',
    secure: 'internal',
    cert,
    key,
  })

  var internal = net.createServer(socket => {
    socket.on('data', d => socket.write(d.toString().toUpperCase()))
  }).listen('8080')

  var client = createClient({
    tunnelHost: 'localhost',
    tunnelPort: '9000',
    controlPort: '9001',
    name: 'test',
    port: '8080',
    secure: true,
    ca,
  })

  client.on('ready', () => {
    var external = net.connect('9002', 'localhost')
    external.on('data', d => {
      t.equal(d.toString(), 'HI')
      external.destroy()
      client.destroy()
      internal.close()
      server.close()
    })
    external.write('test\nhi')
  })
})

tape('plain tcp (secure doesn\'t accept self-signed certs)', t => {
  t.plan(1)

  var server = createServer({
    tunnelPort: '9000',
    controlPort: '9001',
    externalPort: '9002',
    secure: true,
    cert,
    key,
  })

  var internal = net.createServer(socket => {
    socket.on('data', d => socket.write(d.toString().toUpperCase()))
  }).listen('8080')

  var client = createClient({
    tunnelHost: 'localhost',
    tunnelPort: '9000',
    controlPort: '9001',
    name: 'test',
    port: '8080',
    secure: true,
    ca
  })

  client.on('ready', () => {
    var external = tls.connect('9002', 'localhost', { /* ca */ })
    external.on('error', err => {
      t.equal(err.message, 'self signed certificate')
      external.destroy()
      client.destroy()
      internal.close()
      server.close()
    })
  })
})

tape('http host header', t => {
  t.plan(1)

  var server = createServer({
    tunnelPort: '9000',
    controlPort: '9001',
    externalPort: '9002',
  })

  var internal = http.createServer((req, res) => {
    req.on('data', d => res.end(d.toString().toUpperCase()))
  }).listen('8080')

  var client = createClient({
    tunnelHost: 'localhost',
    tunnelPort: '9000',
    controlPort: '9001',
    name: 'test',
    port: '8080',
  })

  client.on('ready', () => {
    var external = http.request({
      hostname: 'localhost',
      port: '9002',
      method: 'POST',
      headers: {
        Host: 'test.localhost'
      }
    }, res => {
      res.on('data', d => {
        t.equal(d.toString(), 'HI')
        client.destroy()
        internal.close()
        server.close()
      })
    })
    external.end('hi')
  })
})

tape('http host header (secure)', t => {
  t.plan(1)

  var server = createServer({
    tunnelPort: '9000',
    controlPort: '9001',
    externalPort: '9002',
    secure: true,
    cert,
    key,
  })

  var internal = http.createServer((req, res) => {
    req.on('data', d => res.end(d.toString().toUpperCase()))
  }).listen('8080')

  var client = createClient({
    tunnelHost: 'localhost',
    tunnelPort: '9000',
    controlPort: '9001',
    name: 'test',
    port: '8080',
    secure: true,
    ca,
  })

  client.on('ready', () => {
    var external = https.request({
      hostname: 'localhost',
      port: '9002',
      method: 'POST',
      ca,
      headers: {
        Host: 'test.bogus.com'
      }
    }, res => {
      res.on('data', d => {
        t.equal(d.toString(), 'HI')
        client.destroy()
        internal.close()
        server.close()
      })
    })
    external.end('hi')
  })
})

tape('http bad name (tunnel not found)', t => {
  t.plan(1)

  var server = createServer({
    tunnelPort: '9000',
    controlPort: '9001',
    externalPort: '9002',
  })

  var internal = http.createServer((req, res) => {
    req.on('data', d => res.end(d.toString().toUpperCase()))
  }).listen('8080')

  var client = createClient({
    tunnelHost: 'localhost',
    tunnelPort: '9000',
    controlPort: '9001',
    name: 'test',
    port: '8080',
  })

  client.on('ready', () => {
    var external = http.request({
      hostname: 'localhost',
      port: '9002',
      method: 'POST',
      headers: {
        Host: 'bogus.localhost'
      }
    }, res => {
      res.on('data', d => {
        t.equal(d.toString(), 'tunnel not found')
        client.destroy()
        internal.close()
        server.close()
      })
    })
    external.end('hi')
  })
})

tape('multi http', t => {
  t.plan(2)

  var server = createServer({
    tunnelPort: '9000',
    controlPort: '9001',
    externalPort: '9002'
  })

  var internalUpper = http.createServer((req, res) => {
    req.on('data', d => res.end(d.toString().toUpperCase()))
  }).listen('8080')

  var internalLower = http.createServer((req, res) => {
    req.on('data', d => res.end(d.toString().toLowerCase()))
  }).listen('8081')

  var clientUpper = createClient({
    tunnelHost: 'localhost',
    tunnelPort: '9000',
    controlPort: '9001',
    name: 'upper',
    port: '8080',
  })

  var clientLower = createClient({
    tunnelHost: 'localhost',
    tunnelPort: '9000',
    controlPort: '9001',
    name: 'lower',
    port: '8081',
  })

  var externalUpper = http.request({
    hostname: 'localhost',
    port: '9002',
    method: 'POST',
    headers: {
      Host: 'upper.localhost'
    }
  }, res => {
    res.on('data', d => {
      t.equal(d.toString(), 'HI')
      end()
    })
  })

  var externalLower = http.request({
    hostname: 'localhost',
    port: '9002',
    method: 'POST',
    headers: {
      Host: 'lower.localhost'
    }
  }, res => {
    res.on('data', d => {
      t.equal(d.toString(), 'hi')
      end()
    })
  })

  var n = 0
  clientLower.on('ready', begin)
  clientLower.on('ready', begin)

  function begin () {
    if (++n < 2) return
    externalUpper.end('hi')
    externalLower.end('HI')
  }

  function end () {
    if (--n > 0) return
    clientUpper.destroy()
    clientLower.destroy()
    internalUpper.close()
    internalLower.close()
    server.close()
  }
})

tape('SNI', t => {
  t.plan(4)

  var internal = http.createServer((req, res) => {
    req.on('data', d => res.end(d.toString().toUpperCase()))
  }).listen('8080')

  var n = 0
  var server = createServer({
    tunnelPort: '9000',
    controlPort: '9001',
    externalPort: '9002',
    secure: true,
    SNICallback: (hostname, cb) => {
      n++
      if (n === 1) {
        // control connect
        t.equal(hostname, 'localhost')
      } else if (n === 2) {
        // external connect
        t.equal(hostname, 'test.bogus.com')
      } else {
        // tunnel connect
        t.equal(hostname, 'localhost')
      }
      cb(null, tls.createSecureContext({
        cert,
        key,
      }))
    }
  })

  var client = createClient({
    tunnelHost: 'localhost',
    tunnelPort: '9000',
    controlPort: '9001',
    name: 'test',
    port: '8080',
    secure: true,
    ca,
  })

  client.on('ready', () => {
    var external = https.request({
      hostname: 'localhost',
      port: '9002',
      method: 'POST',
      ca,
      headers: {
        Host: 'test.bogus.com'
      }
    }, res => {
      res.on('data', d => {
        t.equal(d.toString(), 'HI')
        client.destroy()
        internal.close()
        server.close()
      })
    })
    external.end('hi')
  })
})

tape('registrant ping', t => {
  t.plan(3)

  var server = createServer({
    tunnelPort: '9000',
    controlPort: '9001',
    externalPort: '9002',
    rpcTimeout: 100,
  })

  var internal = net.createServer(socket => {
    socket.on('data', d => socket.write(d.toString().toUpperCase()))
  }).listen('8080')

  var client = createClient({
    tunnelHost: 'localhost',
    tunnelPort: '9000',
    controlPort: '9001',
    name: 'test',
    port: '8080',
    ping: false
  })

  client.on('close', t.pass)

  client.on('ready', () => {
    var external = net.connect('9002', 'localhost')
    external.on('data', d => {
      t.equal(d.toString(), 'HI')

      client = createClient({
        tunnelHost: 'localhost',
        tunnelPort: '9000',
        controlPort: '9001',
        name: 'test',
        port: '8080'
      })

      client.on('ready', () => {
        external = net.connect('9002', 'localhost')
        external.on('data', d => {
          t.equal(d.toString(), 'HI')
          external.destroy()
          client.destroy()
          internal.close()
          server.close()
        })
        external.write('test\nhi')
      })
    })
    external.write('test\nhi')
  })
})

tape('cli', t => {
  t.plan(1)

  var internal = net.createServer(socket => {
    socket.on('data', d => socket.write(d.toString().toUpperCase()))
  }).listen('8080')

  var server = spawn(`${__dirname}/../index.js`, [
    'serve',
    '--secure',
    'false',
  ])

  server.stdout.once('data', () => {
    var client = spawn(`${__dirname}/../index.js`, [
      '--secure',
      'false',
      '--name',
      'test',
    ])

    client.stdout.once('data', () => {
      var external = net.connect('9002', 'localhost')
      external.on('data', d => {
        t.equal(d.toString(), 'HI')
        external.destroy()
        server.kill('SIGTERM')
        client.kill('SIGTERM')
        internal.close()
      })
      external.write('test\nhi')
    })
  })
})
