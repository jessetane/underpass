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
var internalDevServer = http.createServer((req, res) => {
  req.on('data', d => res.end(d.toString().toUpperCase()))
}).listen('8080')

var createServer = require('underpass/src/server')

var server = createServer({
  externalPort: '3000'
})

var createClient = require('underpass/src/client')

var client = createClient({
  name: 'upper-caser',
  port: '8080',
  tunnelHost: 'localhost',
})

client.on('ready', () => {
  http.request({
    hostname: 'localhost',
    port: '3000',
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
