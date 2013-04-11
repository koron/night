// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports = TailFilter;

var LineStream = require('../line_stream.js');
var Options = require('../options.js');
var util = require('util');

util.inherits(TailFilter, LineStream);

function TailFilter(lineStream, options)
{
  this.name = 'tail';
  this.source = lineStream;

  var merged = new Options({
    limit: 10
  }, options);

  var emitter = this;
  var buffer = [];
  var limit = merged.limit - 0;

  lineStream.on('line', function(line) {
    buffer.push(line);
    while (buffer.length > limit) {
      buffer.shift();
    }
  });

  lineStream.on('end', function() {
    for (var i = 0, len = buffer.length; i < len; ++i) {
      emitter.emit_line(buffer[i]);
    }
    emitter.emit_end();
  });

  LineStream.call(this);
}
