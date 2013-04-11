// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports = CommandReader;

var StreamLineReader = require('./stream_line_reader.js');
var util = require('util');
var spawn = require('child_process').spawn;

util.inherits(CommandReader, StreamLineReader);

function CommandReader(cmd, args)
{
  var proc = spawn(cmd, args);

  proc.stderr.setEncoding('utf-8');
  proc.stderr.on('data', function(data) {
    // FIXME: server logging.
    console.error(data);
  });

  // TODO: add terminate method.

  StreamLineReader.call(this, proc.stdout);
}
