// vim:set ts=8 sts=2 sw=2 tw=0:

// TODO: write tests.

// Class: StreamLineReader (extends LineStream)
//  Event: 'line' (linedata)
//  Event: 'end'

var line_stream = require('./line_stream');

function StreamLineReader(stream) {
  this.separator = '\n';
  this.remain = '';

  stream.setEncoding('utf-8');
  if ('read' in stream) {
    stream.on('readable', function() { process_data(stream.read()); });
  } else {
    stream.on('data', process_data);
  }
  stream.on('end', function() { process_end(); });

  var thiz = this;

  function process_data(data) {
    //console.log('data: ');
    var start = 0;
    if (thiz.remain && thiz.remain.length > 0) {
      start = thiz.remain.length
      data = thiz.remain + data;
    }
    while (start >= 0 && start < data.length) {
      var index = data.indexOf(thiz.separator, start);
      if (index < 0) {
	//console.log('remain: ' + data);
	break;
      }
      var line = data.substring(start, index);
      thiz.emit_line(line);
      start = index + 1;
    }
    thiz.remain = (start < data.length) ? data.substring(start) : null;
  }

  function process_end() {
    //console.log('end: ');
    if (thiz.remain && thiz.remain.length > 0) {
      thiz.emit_line(thiz.remain);
      thiz.remain = null;
    }
    thiz.emit_end();
  };
}

StreamLineReader.prototype = new line_stream.LineStream();

exports.StreamLineReader = StreamLineReader;
