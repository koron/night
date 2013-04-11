// vim:set ts=8 sts=2 sw=2 tw=0:

// TODO: write tests.

// Class: HeadFilter (extends LineStream)
//  Event: 'line' (linedata)
//  Event: 'end'

module.exports = HeadFilter;

var LineStream = require('../line_stream.js');
var Options = require('../options.js');
var util = require('util');

util.inherits(HeadFilter, LineStream);

function HeadFilter(lineStream, options)
{
  this.name = 'head';
  this.source = lineStream;

  var merged = new Options({
    start: 0,
    limit: 10
  }, options);

  var emitter = this;
  var start_line = merged.start - 0;
  var end_line = start_line + (merged.limit - 0);
  var count = 0;
  var sent_end = false;

  lineStream.on('line', function(line) {
    if (count < start_line) {
      ++count;
    } else if (count < end_line) {
      ++count;
      emitter.emit_line(line);
    } else if (!sent_end) {
      sent_end = true;
      emitter.emit_end();
    }
  });

  lineStream.on('end', function() {
    if (!sent_end) {
      sent_end = true;
      emitter.emit_end();
    }
  });

  LineStream.call(this);
}
