// vim:set ts=8 sts=2 sw=2 tw=0 et:

module.exports = CountFilter;

var LineStream = require('../line_stream.js');
var Options = require('../options.js');
var util = require('util');

util.inherits(CountFilter, LineStream);

function CountFilter(lineStream, options)
{
  this.name = 'count';
  this.source = lineStream;

  var merged = new Options({
  }, options);

  var emitter = this;
  var count = 0;

  lineStream.on('line', function(line) {
    count += 1;
  });

  lineStream.on('end', function() {
    emitter.emit_line(count.toString());
    emitter.emit_end();
  });

  LineStream.call(this);
}
