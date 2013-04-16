// vim:set ts=8 sts=2 sw=2 tw=0 et:

module.exports = MultiReader;

var LineStream = require('../line_stream.js');
var util = require('util');

util.inherits(MultiReader, LineStream);

function MultiReader(factories)
{
  var emitter = this;

  function next()
  {
    if (factories.length <= 0) {
      emitter.emit_end();
    } else {
      var factory = factories.shift();
      var reader = factory();
      reader.on('line', function(line) {
        emitter.emit_line(line);
      });
      reader.on('end', function() {
        next();
      });
    }
  }

  process.nextTick(function() {
    next();
  });

  LineStream.call(this);
}
