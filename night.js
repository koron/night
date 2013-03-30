// vim:set ts=8 sts=2 sw=2 tw=0:

var fs = require('fs');
var http = require('http');

var Options = require('./lib/options.js');
var Reader = require('./lib/stream_line_reader.js');
var Head = require('./lib/head_filter.js');
var Tail = require('./lib/tail_filter.js');
var Grep = require('./lib/grep_filter.js');

var options = new Options({
  port: 8080,
  prefix: '/night'
});

var server = http.createServer(handleRequest);
server.listen(options.port);

function handleRequest(request, response)
{
  if (request.url.indexOf(options.prefix + '/') == 0) {
    handleNightRequst(request, response);
  } else {
    response.writeHead(404);
    response.end('');
  }
}

function handleNightRequst(request, response)
{
  var path = getNightPath(request.url);
  fs.stat(path, function(err, stats) {
    if (err) {
      response.writeHead(404);
      response.end('stat failed: ' + err.message);
      return;
    }
    if (stats.isFile()) {
      var source = getNightSource(path, getNightFilters(request.url));
      response.writeHead(200, {
	'Content-Type': 'application/octet'
      });
      transferFile(source, response, function() {
	response.end();
      });
    } else {
      response.writeHead(404);
      response.end('Not a file');
    }
  });
}

function getNightPath(url)
{
  url = url.substring(options.prefix.length);
  var index = url.indexOf('?');
  var path = index < 0 ? url : url.substring(0, index);
  // FIXME: consider drive name for Windows.
  return path;
}

function getNightSource(path, filters)
{
  var src = new Reader(fs.createReadStream(path));
  for (var i = 0, len = filters.length; i < len; ++i) {
    var filter = filters[i];
    src = new filter(src);
  }
  return src;
}

function transferFile(src, dest, callback) {
  src.on('line', function(line) {
    dest.write(line);
    dest.write('\n');
  });
  if (callback) {
    src.on('end', callback);
  }
}

function getNightFilters(url)
{
  // TODO: implment me.
  return [];
}
