#!/usr/bin/env node

var fs = require('fs')
var minimist = require('minimist')
var createClient = require('./src/client')
var createServer = require('./src/server')

var argv = minimist(process.argv.slice(2), { string: [ 's', 'secure' ]})
var args = argv._

var secure = argv.s || argv.secure || process.env.SECURE || true
if (secure) {
  if (secure === 'false' || secure === '0') {
    secure = false
  } else {
    var key = process.env.KEY
    if (!key) {
      var keyPath = argv.k || argv['key-path'] || process.env.KEY_PATH
      if (keyPath) {
        key = fs.readFileSync(keyPath)
      }
    }
    var cert = process.env.CERT
    if (!cert) {
      var certPath = argv.C || argv['certificate-path'] || process.env.CERT_PATH
      if (certPath) {
        cert = fs.readFileSync(certPath)
      }
    }
    var ca = process.env.CA_CERT
    if (!ca) {
      var caCertPath = argv.a || argv['ca-certificate-path'] || process.env.CA_CERT_PATH
      if (caCertPath) {
        ca = fs.readFileSync(caCertPath)
      }
    }
  }
}

if (args[0] === 'serve') {
  var opts = {
    tunnelPort: argv.t || argv['tunnel-port'] || process.env.TUNNEL_PORT || '9000',
    controlPort: argv.c || argv['control-port'] || process.env.CONTROL_PORT || '9001',
    externalPort: argv.e || argv['external-port'] || process.env.EXTERNAL_PORT || '9002',
    secure,
    cert,
    key,
  }
  createServer(opts).on('ready', () => {
    console.log(`tunnel server listening on ${opts.tunnelPort}`)
    console.log(`control server listening on ${opts.controlPort}`)
    console.log(`external server listening on ${opts.externalPort}`)
  })
} else {
  var opts = {
    tunnelHost: argv.h || argv['tunnel-host'] || process.env.TUNNEL_HOST || 'localhost',
    tunnelPort: argv.t || argv['tunnel-port'] || process.env.TUNNEL_PORT || '9000',
    controlPort: argv.c || argv['control-port'] || process.env.CONTROL_PORT || '9001',
    name: argv.n || argv.name || argv.subdomain || process.env.NAME || String(Math.random()).slice(2),
    port: argv.p || argv.port || process.env.PORT || '8080',
    secure,
    ca,
  }
  createClient(opts).on('ready', externalPort => {
    console.log(`tunnel open at ${opts.secure ? 'https' : 'http'}://${opts.name}.${opts.tunnelHost}${externalPort == '80' ? '' : `:${externalPort}`}`)
  })
}
