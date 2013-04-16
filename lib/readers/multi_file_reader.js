// vim:set ts=8 sts=2 sw=2 tw=0 et:

module.exports = MultiFileReader;

var MultiReader = require('./multi_reader.js');
var FileReader = require('./file_reader.js');
var util = require('util');

util.inherits(MultiFileReader, MultiReader);

function MultiFileReader(files)
{
  var factories = [];
  for (var i = 0, len = files.length; i < len; ++i) {
    factories.push(newFactory(files[i]));
  }

  MultiReader.call(this, factories);
}

function newFactory(path)
{
  return function() {
    return new FileReader(path);
  };
}
