// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports = FileReader

var StreamLineReader = require('./stream_line_reader.js');
var util = require('util');
var fs = require('fs');
var zlib = require('zlib');
var spawn = require('child_process').spawn;

var RX_GZ = /\.gz$/;
var RX_BZ2 = /\.bz2$/;

util.inherits(FileReader, StreamLineReader);

function FileReader(path)
{
  var stream;
  if (path.match(RX_GZ)) {
    stream = fs.createReadStream(path).pipe(zlib.createGunzip());
  } else if (path.match(RX_BZ2)) {
    var proc = spawn('bzip2', [ '-d', '-c', fs.realpathSync(path) ]);
    stream = proc.stdout;
    // set error stream.
    proc.stderr.setEncoding('utf-8');
    proc.stderr.on('data', function(data) {
      // FIXME: server logging.
      console.error(data);
    });
  } else {
    stream = fs.createReadStream(path);
  }
  StreamLineReader.call(this, stream);
}
