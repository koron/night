// vim:set ts=8 sts=2 sw=2 tw=0:

// TODO: write tests.

// Class: StreamLineReader
//  Event: 'line' (linedata)
//  Event: 'end'

var EventEmitter = require('events').EventEmitter;

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
      emit_line(line);
      start = index + 1;
    }
    thiz.remain = (start < data.length) ? data.substring(start) : null;
  }

  function process_end() {
    //console.log('end: ');
    if (thiz.remain && thiz.remain.length > 0) {
      emit_line(thiz.remain);
      thiz.remain = null;
    }
    emit_end();
  };

  function emit_line(line) {
    //console.log('line: ' + line);
    process.nextTick(function() {
      thiz.emit('line', line);
    });
  }

  function emit_end() {
    process.nextTick(function() {
      thiz.emit('end');
    });
  }
}

StreamLineReader.prototype = new EventEmitter();

exports.StreamLineReader = StreamLineReader;
