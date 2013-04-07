// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports = FileReader

var StreamLineReader = require('./stream_line_reader.js');
var util = require('util');
var fs = require('fs');
var zlib = require('zlib');

var RX_GZ = /\.gz$/;

util.inherits(FileReader, StreamLineReader);

function FileReader(path)
{
  var stream = fs.createReadStream(path);
  if (path.match(RX_GZ)) {
    stream = stream.pipe(zlib.createGunzip());
  }
  StreamLineReader.call(this, stream);
}
