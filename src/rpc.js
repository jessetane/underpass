var TerminalStream = require('terminal-stream')
var RPCEngine = require('rpc-engine')

module.exports = function (stream) {
  var terminal = new TerminalStream()
  stream.pipe(terminal).pipe(stream)
  var rpc = new RPCEngine
  rpc.serialize = JSON.stringify
  rpc.deserialize = JSON.parse
  terminal.onmessage = rpc.onmessage
  rpc.send = terminal.send.bind(terminal)
  return rpc
}
