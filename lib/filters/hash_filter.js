// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports = HashFilter;

var LineStream = require('../line_stream.js');
var Options = require('../options.js');
var util = require('util');
var crypto = require('crypto');

util.inherits(HashFilter, LineStream);

function HashFilter(lineStream, options)
{
  this.name = 'hash';
  this.source = lineStream;

  var merged = new Options({
    algorithm: 'md5',
    encoding: 'hex',
  }, options);

  var emitter = this;
  var algorithm = merged.algorithm;
  var encoding = merged.encoding;
  var hash = crypto.createHash(algorithm);

  lineStream.on('line', function(line) {
    hash.update(line + '\n', 'utf8');
  });

  lineStream.on('end', function() {
    var digest = hash.digest(encoding);
    emitter.emit_line(digest);
    emitter.emit_end();
  });

  LineStream.call(this);
}
