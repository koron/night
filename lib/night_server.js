// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports.Server = Server;

var fs = require('fs');
var http = require('http');
var util = require('util');

var Reader = require('./stream_line_reader.js');
var DirectoryReader = require('./directory_reader.js');
var FilterManager = require('./filter_manager.js');

var CONFIG = {
  port: 9280,
  prefix: 'files',
  locations: [],
  users: [],
}

function Server(conffile, verbose)
{
  this.config = loadConfig(conffile);
  this.verbose = verbose ? true : false;
  this.httpServer = http.createServer(handleRequest);

  var config = this.config;
  var prefix = regulatePrefix(this.config.prefix);
  var isAllowedLocation = newLocationChecker(this.config.locations);

  function newLocationChecker(locations)
  {
    if (locations.length == 0) {
      return function(path) { return true; }
    } else {
      return function(path) {
	for (var i = 0, len = locations.length; i < len; ++i) {
	  if (path.indexOf(locations[i]) == 0) {
	    return true;
	  }
	}
	return false;
      };
    }
  }

  function regulatePrefix(str)
  {
    if (str.indexOf('/') != 0) {
      str = '/' + str;
    }
    if (str.lastIndexOf('/') != str.length - 1) {
      str += '/';
    }
    return str;
  }

  function isTypeMatch(a, b)
  {
    var ta = typeof a;
    var tb = typeof b;
    if (ta !== tb) {
      return false;
    } else if (ta === 'object' && ta.constructor !== tb.constructor) {
      return false;
    } else {
      return true;
    }
  }

  function loadConfig(filename)
  {
    var retval = JSON.parse(JSON.stringify(CONFIG));
    if (filename != null) {
      var loaded = JSON.parse(fs.readFileSync(filename));
      for (var key in loaded) {
	if (!(key in CONFIG)) {
	  // TODO: show error/warning message.
	} else if (!isTypeMatch(CONFIG[key], loaded[key])) {
	  // TODO: show error/warning message.
	} else {
	  retval[key] = loaded[key];
	}
      }
    }
    return retval;
  }

  function handleRequest(request, response)
  {
    if (request.url.indexOf(prefix) == 0) {
      handleNightRequst(request, response);
    } else {
      response.writeHead(404);
      response.end('');
    }
  }

  function handleNightRequst(request, response)
  {
    var path = getNightPath(request.url);
    if (!isAllowedLocation(path)) {
      response.writeHead(403);
      response.end('Disallow to access: ' + path);
    }
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
    var filterSpec = getQueryString(request.url);
    var filtered = FilterManager.applyFilterSpec(source, filterSpec);
    response.writeHead(200, {
      'Content-Type': 'text/plain'
    });
    // transfer all lines to the response.
    filtered.on('line', function(line) {
      response.write(line);
      response.write('\n');
    });
    filtered.on('end', function() {
      response.end();
    });
  }

  function getNightPath(url)
  {
    url = url.substring(prefix.length);
    var index = url.indexOf('?');
    var path = index < 0 ? url : url.substring(0, index);
    // FIXME: consider drive name for Windows.
    path = '/' + path;
    return path;
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
