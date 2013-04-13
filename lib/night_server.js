// vim:set ts=8 sts=2 sw=2 tw=0 et:

module.exports.Server = Server;

var fs = require('fs');
var http = require('http');
var https = require('https');
var util = require('util');
var domain = require('domain');

var DirectoryReader = require('./readers/directory_reader.js');
var FileReader = require('./readers/file_reader.js');
var CommandReader = require('./readers/command_reader.js');
var FilterManager = require('./filter_manager.js');

var PREFIX_FILES = '/files/';
var PREFIX_COMMANDS = '/commands/';

var CONFIG = {
  ssl: false,
  ssl_key: '',
  ssl_cert: '',
  port: 9280,
  locations: [],
  forbiddens: [],
  users: [],
  commands: {},
}

var RX_REFRESH = /^refresh=([1-9]\d*)$/;

function Server(conffile, verbose)
{
  var config = loadConfig(conffile);
  var httpServer = createServer(config, handleRequestWithDomain);
  var isAllowedUser = newUserChecker(config.users);
  var isAllowedLocation = newLocationChecker(config.locations,
      config.forbiddens);

  this.config = loadConfig(conffile);
  this.httpServer = httpServer;
  this.verbose = verbose;

  function toAuthorizedCode(user)
  {
    return new Buffer(user).toString('base64');
  }

  function newUserChecker(users)
  {
    if (users.length == 0) {
      return function(request) { return true; }
    } else {
      // setup authorized table.
      var authorized = {};
      for (var i = 0, len = users.length; i < len; ++i) {
        var code = new Buffer(users[i]).toString('base64');
        authorized[util.format('Basic %s', code)] = true;
      }
      // return checker function.
      return function(request) {
        var auth = request.headers['authorization'];
        return authorized.hasOwnProperty(auth);
      };
    }
  }

  function newLocationChecker(locations, forbiddens)
  {
    var isAllowed = newMatcher(locations, true);
    var isDisallowed = newMatcher(forbiddens, false);
    return function(path) {
      return isAllowed(path) && !isDisallowed(path)
    };
  }

  function newMatcher(locations, defaultValue)
  {
    if (locations.length == 0) {
      return function(path) { return defaultValue; }
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
          console.error('Unknown config key - %s', key);
        } else if (!isTypeMatch(CONFIG[key], loaded[key])) {
          console.error('Type mismatch for config key - %s', key);
        } else {
          retval[key] = loaded[key];
        }
      }
    }
    return retval;
  }

  function handleError(request, response, err)
  {
    try {
      response.writeHead(500);
      response.end(err.stack);
    } catch (e) {
      consle.error('Error handling error', e);
      request.domain.dispose();
    }
  }

  function handleRequestWithDomain(request, response)
  {
    var d = request.domain = domain.create();
    d.add(request);
    d.add(response);
    d.on('error', function(err) {
      handleError(request, response, err);
    });
    d.run(function() {
      handleRequest(request, response);
    });
  }

  function handleRequest(request, response)
  {
    if (!isAllowedUser(request)) {
      response.writeHead(401, {
        'WWW-Authenticate': 'Basic realm="night - filtered file server"'
      });
      response.end('Disallow guests access');
    } else if (request.url.indexOf(PREFIX_FILES) == 0) {
      handleFileResource(request, response);
    } else if (request.url.indexOf(PREFIX_COMMANDS) == 0) {
      handleCommandResource(request, response);
    } else {
      response.writeHead(404);
      response.end('');
    }
  }

  function handleCommandResource(request, response)
  {
    var data = getCommandResourceData(request.url);
    if (data.error) {
      response.writeHead(404);
      response.end('Unknown or invalid command: ' + data.name);
      return;
    }
    var reader = new CommandReader(data.cmd, data.args);
    transfer(request, response, reader);
  }

  function handleFileResource(request, response)
  {
    var path = getFileResourcePath(request.url);
    if (!isAllowedLocation(path)) {
      response.writeHead(403);
      response.end('Disallow to access: ' + path);
    }
    fs.stat(path, request.domain.bind(function(err, stats) {
      if (err) {
        response.writeHead(404);
        response.end('stat failed: ' + err.message);
        return;
      } else if (stats.isFile()) {
        transfer(request, response, new FileReader(path));
      } else if (stats.isDirectory()) {
        transfer(request, response, new DirectoryReader(path));
      } else {
        response.writeHead(404);
        response.end('Not a file');
      }
    }));
  }

  function transfer(request, response, source)
  {
    var param = parseQueryString(request.url);
    var filterSpec = getQueryString(request.url);
    var filtered = FilterManager.applyFilterSpec(source, param.filterSpec);
    // set domain to emitters.
    request.domain.add(source);
    request.domain.add(filtered);
    // Prepare HTTP response header.
    var header = {
      'Content-Type': 'text/plain'
    };
    if (param.refresh > 0) {
      header['Refresh'] =
        util.format('%d; URL=%s', param.refresh, request.url);
    }
    // transfer all lines to the response.
    response.writeHead(200, header);
    filtered.on('line', function(line) {
      response.write(line);
      response.write('\n');
    });
    filtered.on('end', function() {
      response.end();
    });
  }

  function getCommandResourceData(url)
  {
    var name = getPathPart(url).substring(PREFIX_COMMANDS.length);
    var value = config.commands[name];
    if (!value || value.length == 0) {
      return {
        name: name,
        error: true,
      };
    } else {
      return {
        name: name,
        error: false,
        cmd: value[0],
        args: value.slice(1),
      };
    }
  }

  function getFileResourcePath(url)
  {
    return '/' + getPathPart(url).substring(PREFIX_FILES.length);
  }

  function getPathPart(url)
  {
    var index = url.indexOf('?');
    return index < 0 ? url : url.substring(0, index);
  }

  function getQueryString(url)
  {
    var index = url.indexOf('?');
    return index >= 0 ? decodeURIComponent(url.substring(index + 1)) : ''
  }

  function parseQueryString(url)
  {
    var refresh = 0;
    var parts = getQueryString(url).split('&');
    var filters = [];
    for (var i = 0, len = parts.length; i < len; ++i) {
      var item = parts[i];
      var m;
      if (m = RX_REFRESH.exec(item)) {
        refresh = parseInt(m[1]);
      } else {
        filters.push(item);
      }
    }
    return {
      filterSpec: filters.join('&'),
      refresh: refresh,
    };
  }
}

Server.prototype.start = function()
{
  this.httpServer.listen(this.config.port);
}

function createServer(config, handle)
{
  if (config.ssl) {
    return https.createServer({
      key: fs.readFileSync(config.ssl_key),
      cert: fs.readFileSync(config.ssl_cert),
    }, handle);
  } else {
    return http.createServer(handle);
  }
}
