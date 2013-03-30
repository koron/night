// vim:set ts=8 sts=2 sw=2 tw=0:

// TODO: write tests.

// Class: HeadFilter (extends LineStream)
//  Event: 'line' (linedata)
//  Event: 'end'

module.exports = HeadFilter;

var LineStream = require('./line_stream.js');
var Options = require('./options.js');
var util = require('util');

util.inherits(HeadFilter, LineStream);

function HeadFilter(lineStream, options)
{
  this.options = new Options({
    start: 0,
    limit: 10
  }, options);
  this.count = 0;
  this.sent_end = false;

  var thiz = this;

  lineStream.on('line', function(line) {
    if (thiz.count >= thiz.options.start && thiz.count < thiz.options.limit) {
      ++thiz.count;
      thiz.emit_line(line);
    } else if (!thiz.sent_end) {
      thiz.sent_end = true;
      thiz.emit_end();
    }
  });

  lineStream.on('end', function() {
    if (!thiz.sent_end) {
      thiz.sent_end = true;
      thiz.emit_end();
    }
  });

  LineStream.call(this);
}
