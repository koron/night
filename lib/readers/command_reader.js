// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports = CommandReader;

var LineStream = require('../line_stream.js');
var StreamLineReader = require('./stream_line_reader.js');
var util = require('util');
var spawn = require('child_process').spawn;

util.inherits(CommandReader, LineStream);

function CommandReader(cmd, args)
{
  var emitter = this;
  var proc = spawn(cmd, args);
  var count = 2;

  function toReader(stream) {
    stream.setEncoding('utf-8');
    var reader = new StreamLineReader(stream);
    reader.on('line', function(line) {
      emitter.emit('line', line);
    });
    reader.on('end', function() {
      if (count > 0) {
        --count;
        if (count <= 0) {
          emitter.emit('end');
        }
      }
    });
  }

  var stdoutReader = toReader(proc.stdout);
  var stderrReader = toReader(proc.stderr);

  // TODO: add terminate method.

  LineStream.call(this);
}
