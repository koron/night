// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports = DirectoryReader;

var fs = require('fs');
var util = require('util');
var LineStream = require('./line_stream.js');

util.inherits(DirectoryReader, LineStream);

function DirectoryReader(path)
{
  this.path = path;

  fs.readdir(path, onReaddir);

  var emitter = this;
  var targets = [];

  function onReaddir(err, files)
  {
    if (err) {
      emitter.emit_end();
      console.log('DirectoryReader#onReaddir: ' + e);
    } else {
      targets = files;
      readNext();
    }
  }

  function readNext()
  {
    if (targets.length == 0) {
      emitter.emit_end();
      return;
    }
    var file = targets.shift();
    fs.stat(path + '/' + file, function(err, stats) {
      var out = [];
      out.push(file);
      if (err) {
	out.push('error');
	out.push(0);
	out.push(err.code);
      } else {
	out.push(toType(stats));
	out.push(stats.size);
	out.push(stats.mtime.toUTCString());
      }
      emitter.emit_line(out.join('\t'));
      readNext();
    });
  }

  function toType(stats)
  {
    if (stats.isFile()) {
      return 'file';
    } else if (stats.isDirectory()) {
      return 'dir';
    } else {
      return 'unknown';
    }
  }
}
