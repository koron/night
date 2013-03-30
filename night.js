// vim:set ts=8 sts=2 sw=2 tw=0:

var fs = require('fs');
var Reader = require('./lib/stream_line_reader');
var Head = require('./lib/head_filter');
var Tail = require('./lib/tail_filter');

var s = fs.createReadStream('test.txt', { bufferSize: 1 });
var reader = new Tail(new Reader(s));

var count = 0;
reader.on('line', function(line) {
    console.log('line: ' + line);
    ++count;
});
reader.on('end', function() {
    console.log('count: ' + count);
});
