// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports = TailFilter;

var LineStream = require('./line_stream');
var Options = require('./options');
var util = require('util');

util.inherits(TailFilter, LineStream);

function TailFilter(lineStream, options)
{
  this.options = new Options({
    limits: 10
  }, options);

  this.buffer = [];

  var thiz = this;

  lineStream.on('line', function(line) {
    thiz.buffer.push(line);
    while (thiz.buffer.length > thiz.options.limits) {
      thiz.buffer.shift();
    }
  });

  lineStream.on('end', function() {
    for (var i = 0, len = thiz.buffer.length; i < len; ++i) {
      thiz.emit_line(thiz.buffer[i]);
    }
    thiz.emit_end();
  });

  LineStream.call(this);
}
