// vim:set ts=8 sts=2 sw=2 tw=0:

var fs = require('fs');
var Reader = require('./lib/stream_line_reader').StreamLineReader;

var s = fs.createReadStream('test.txt', { bufferSize: 1 });
var r = new Reader(s);

var count = 0;
r.on('line', function(line) {
    console.log('line: ' + line);
    ++count;
});
r.on('end', function() {
    console.log('count: ' + count);
});
