// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports = FileReader;

var StreamLineReader = require('./stream_line_reader.js');
var util = require('util');
var fs = require('fs');
var zlib = require('zlib');
var spawn = require('child_process').spawn;

var RX_GZ = /\.gz$/;
var RX_BZ2 = /\.bz2$/;
var RX_LZ4 = /\.lz4$/;

util.inherits(FileReader, StreamLineReader);

function createProcStream(cmd, args)
{
  var proc = spawn(cmd, args);
  stream = proc.stdout;
  // set error stream.
  proc.stderr.setEncoding('utf-8');
  proc.stderr.on('data', function(data) {
    // FIXME: server logging.
    console.error(data);
  });
  return stream;
}

function FileReader(path)
{
  var stream;
  if (path.match(RX_GZ)) {
    stream = fs.createReadStream(path).pipe(zlib.createGunzip());
  } else if (path.match(RX_BZ2)) {
    stream = createProcStream('bzip2', [ '-d', '-c', fs.realpathSync(path) ]);
  } else if (path.match(RX_LZ4)) {
    stream = createProcStream('lz4', [ '-d', '-c', fs.realpathSync(path) ]);
  } else {
    stream = fs.createReadStream(path);
  }
  StreamLineReader.call(this, stream);
}
