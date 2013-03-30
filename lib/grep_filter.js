// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports = GrepFilter;

var LineStream = require('./line_stream');
var Options = require('./options');
var util = require('util');

util.inherits(GrepFilter, LineStream);

function GrepFilter(lineStream, re, options)
{
  this.options = new Options({
    match: true
  }, options);

  var thiz = this;

  lineStream.on('line', function(line) {
    if ((line.search(re) >= 0) == thiz.options.match) {
      thiz.emit_line(line);
    }
  });

  lineStream.on('end', function() {
    thiz.emit_end();
  });

  LineStream.call(this);
}
