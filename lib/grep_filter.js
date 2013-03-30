// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports = GrepFilter;

var LineStream = require('./line_stream.js');
var Options = require('./options.js');
var util = require('util');

util.inherits(GrepFilter, LineStream);

function GrepFilter(lineStream, options)
{
  this.name = 'grep';
  this.source = lineStream;

  var merged = new Options({
    re: null,
    match: true
  }, options);

  var emitter = this;
  var match = JSON.parse(merged.match);
  var re = merged.re ? new RegExp(merged.re) : new RegExp('');

  lineStream.on('line', function(line) {
    if ((line.search(re) >= 0) == match) {
      emitter.emit_line(line);
    }
  });

  lineStream.on('end', function() {
    emitter.emit_end();
  });

  LineStream.call(this);
}
