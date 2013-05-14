// vim:set sts=2 sw=2 tw=0 et:

module.exports = StringReader;

var LineStream = require('../line_stream');
var util = require('util');

util.inherits(StringReader, LineStream);

function StringReader(str)
{
  var emitter = this;
  var lines = str.split('\n');
  var index = 0;

  function sendLine()
  {
    if (index < lines.length) {
      emitter.emit('line', lines[index++]);
      process.nextTick(sendLine);
    } else {
      emitter.emit('end');
    }
  }

  process.nextTick(sendLine);

  LineStream.call(this);
}
