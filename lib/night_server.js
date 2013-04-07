// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports.startServer = startServer;
module.exports.Server = Server;

var fs = require('fs');
var http = require('http');
var util = require('util');

var Reader = require('./stream_line_reader.js');
var DirectoryReader = require('./directory_reader.js');
var Head = require('./head_filter.js');
var Tail = require('./tail_filter.js');
var Grep = require('./grep_filter.js');
var Cut = require('./cut_filter.js');

var filterTable = {
  'cut': Cut,
  'grep': Grep,
  'head': Head,
  'tail': Tail,
}

function parseAsFilterFactory(str)
{
  var subparts = str.split('=', 2);
  var name = subparts[0];
  var options = subparts.length >= 2 ? parseFilterOptions(subparts[1]) : null;
  if (name in filterTable) {
    return newFilterFactory(filterTable[name], options);
  } else {
    return null;
  }
}

function parseFilterOptions(str)
{
  var options = {};
  var parts = str.split(';');
  for (var i = 0, len = parts.length; i < len; ++i) {
    var subparts = parts[i].split(':', 2);
    options[subparts[0]] = subparts[1];
  }
  return options;
}

function newFilterFactory(ctor, options)
{
  return function(src) {
    return new ctor(src, options);
  }
}

function applyFilters(source, filters)
{
  var src = source;
  for (var i = 0, len = filters.length; i < len; ++i) {
    var filter = filters[i];
    var newsrc = filter(src);
    src = newsrc;
  }
  return src;
}

function loadConfig(filepath)
{
  // TODO:
  return {
    port: 9280,
    prefix: '/files',
  };
}

function Server(conffile, verbose)
{
  this.config = loadConfig(conffile);
  this.verbose = verbose ? true : false;
  this.httpServer = http.createServer(handleRequest);

  var config = this.config;
  var prefix = this.config.prefix;

  function handleRequest(request, response)
  {
    if (request.url.indexOf(prefix + '/') == 0) {
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
      } else if (stats.isFile()) {
	transfer(request, response, new Reader(fs.createReadStream(path)));
      } else if (stats.isDirectory()) {
	transfer(request, response, new DirectoryReader(path));
      } else {
	response.writeHead(404);
	response.end('Not a file');
      }
    });
  }

  function transfer(request, response, source)
  {
    source = applyFilters(source, getNightFilters(request.url));
    response.writeHead(200, {
      'Content-Type': 'text/plain'
    });
    // transfer all lines to the response.
    source.on('line', function(line) {
      response.write(line);
      response.write('\n');
    });
    source.on('end', function() {
      response.end();
    });
  }

  function handleFileSource(request, response, path)
  {
    var source = getFileSource(path, getNightFilters(request.url));
    response.writeHead(200, {
      'Content-Type': 'text/plain'
    });
    transferAllLines(source, response, function() {
      response.end();
    });
  }

  function handleDirectorySource(request, response, path)
  {
    var source = getDirectorySource(path, getNightFilters(request.url));
    response.writeHead(200, {
      'Content-Type': 'text/plain'
    });
    transferAllLines(source, response, function() {
      response.end();
    });
  }

  function getNightPath(url)
  {
    url = url.substring(prefix.length);
    var index = url.indexOf('?');
    var path = index < 0 ? url : url.substring(0, index);
    // FIXME: consider drive name for Windows.
    return path;
  }

  function getNightFilters(url)
  {
    var filters = [];
    var parts = getQueryString(url).split('&');
    for (var i = 0, len = parts.length; i < len; ++i) {
      var factory = parseAsFilterFactory(parts[i]);
      if (factory) {
	filters.push(factory);
      } else {
	// TODO: show error.
      }
    }
    return filters;
  }

  function getQueryString(url)
  {
    var index = url.indexOf('?');
    return index >= 0 ? url.substring(index + 1) : ''
  }
}

Server.prototype.start = function()
{
  this.httpServer.listen(this.config.port);
}
