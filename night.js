// vim:set ts=8 sts=2 sw=2 tw=0:

var fs = require('fs');
var http = require('http');
var util = require('util');

var Options = require('./lib/options.js');
var Reader = require('./lib/stream_line_reader.js');
var Head = require('./lib/head_filter.js');
var Tail = require('./lib/tail_filter.js');
var Grep = require('./lib/grep_filter.js');
var Cut = require('./lib/cut_filter.js');

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
	'Content-Type': 'text/plain'
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
    var newsrc = filter(src);
    src = newsrc;
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

var filterTable = {
  'cut': Cut,
  'grep': Grep,
  'head': Head,
  'tail': Tail,
}

function getNightFilters(url)
{
  var filters = [];
  var parts = getQueryString(url).split('&');
  for (var i = 0, len = parts.length; i < len; ++i) {
    var subparts = parts[i].split('=', 2);
    var name = subparts[0];
    var options = subparts.length >= 2 ? parseOptions(subparts[1]) : null;
    if (name in filterTable) {
      filters.push(filterFactory(filterTable[name], options));
    } else {
      // TODO: error.
    }
  }
  return filters;
}

function filterFactory(ctor, options)
{
  return function(src) {
    return new ctor(src, options);
  }
}

function getQueryString(url)
{
  var index = url.indexOf('?');
  return index >= 0 ? url.substring(index + 1) : ''
}

function parseOptions(str)
{
  var options = {};
  var parts = str.split(';');
  for (var i = 0, len = parts.length; i < len; ++i) {
    var subparts = parts[i].split(':', 2);
    options[subparts[0]] = subparts[1];
  }
  return options;
}
