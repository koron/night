// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports = ThroughFilter;

var LineStream = require('../line_stream.js');
var util = require('util');

util.inherits(ThroughFilter, LineStream);

function ThroughFilter(lineStream, option)
{
  lineStream.on('line', function(line) {
    emitter.emit_line(line);
  });
  lineStream.on('end', function() {
    emit_line.emit_end();
  });
}
