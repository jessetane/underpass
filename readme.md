# underpass
An efficient, secure [localtunnel](https://github.com/localtunnel/localtunnel) clone.

[![npm](http://img.shields.io/npm/v/underpass.svg?style=flat-square)](http://www.npmjs.org/underpass)
[![tests](https://img.shields.io/travis/jessetane/underpass.svg?style=flat-square&branch=master)](https://travis-ci.org/jessetane/underpass)

## Why
localtunnel is super awesome, but it goes down frequently or kicks clients at odd intervals. Also, although it secures connections between the server and the outside world, the actual tunnels themselves are unprotected.

## How
Every localtunnel client opens ten connections to the server on startup and hopes that this number will be suitable for the majority of situations. Generally this works well enough, but if more than ten connections are required, some external consumers may starve; conversely if there is only a single consumer, the other nine connections go to waste. So, instead of trying to guess the perfect number of connections to open, this module sets up a dedicated "control" connection and uses it to ask for additional connections on demand.

## Install
``` shell
$ npm install -g underpass
```

## Demo
There should be a server up and running at tunnels.simple-machines.io, you can try it out like so:
``` shell
$ up -h tunnels.simple-machines.io -n demo
```
This should proxy TCP connections to demo.tunnels.simple-machines.io through to your local machine on port 8080 (the default). Note that if you use a custom name for your tunnel it may take a moment for your initial connection to go through while an ssl certificate is provisioned for you.

## Command line usage

#### Client
``` shell
$ up [OPTION]
```

#### Server
``` shell
$ up serve [OPTION]
```

#### `[option]`
* `-n --name ENV:NAME (random)`  
  * Tunnel identifier to request, used only by clients. Random by default
* `-p --port ENV:PORT (8080)`  
  * Port on localhost clients should proxy connects to
* `-h --tunnel-host ENV:TUNNEL_HOST (localhost)`  
  * Host where the underpass server is running
* `-t --tunnel-port ENV:TUNNEL_PORT (9000)`  
  * Port clients should connect new tunnel connections to
* `-c --control-port ENV:CONTROL_PORT (9001)`  
  * Port clients should connect their control socket to
* `-e --external-port ENV:EXTERNAL_PORT (9002)`  
  * Port the server should listen on for connections from the outside world
* `-s --secure ENV:SECURE (true)`
  * `false` Plain TCP on both sides of the server
  * `true` Connections on both sides of the server are secured with TLS
  * `internal` TLS between the server and client only
  * `external` TLS between the server and the outside world only
* `-k --key-path ENV:KEY[_PATH]`
  * Filesystem path to the key to use for TLS. The literal key can only be passed via the environment
* `-C --certificate-path ENV:CERT[_PATH]`
  * Filesystem path to the certificate to use for TLS
* `-a --ca-certificate-path ENV:CA_CERT[_PATH]`
  * Filesystem path to the CA certificate to use for TLS (used by clients for testing with unsigned certs)

## JavaScript API
``` javascript
var createClient = require('underpass/src/client')
var createServer = require('underpass/src/server')

var internalDevServer = http.createServer((req, res) => {
  req.on('data', d => res.end(d.toString().toUpperCase()))
}).listen('8080')

var server = createServer({
  tunnelPort: '9000',
  controlPort: '9001',
  externalPort: '9002',
  // secure: true,
  // SNICallback: (hostname, cb) => {
  //   cb(new tls.createSecureContext({ /* cert, key */ }))
  // }
})

var client = createClient({
  tunnelHost: 'localhost',
  tunnelPort: '9000',
  controlPort: '9001',
  name: 'upper-caser',
  port: '8080',
  // secure: true
})

client.on('ready', () => {
  http.request({
    hostname: 'localhost',
    port: '9002',
    method: 'POST',
    headers: {
      host: 'upper-caser.localhost'
    }
  }, res => {
    res.on('data', d => {
      console.log(d.toString()) // => HI
      client.destroy()
      server.close()
    })
  }).end('hi')
})
```

## Test
``` javascript
npm run test
```

## License
Public domain
