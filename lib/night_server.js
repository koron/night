// vim:set ts=8 sts=2 sw=2 tw=0 et:

module.exports.Server = Server;

var PACKAGE = require(__dirname + '/../package.json');

var fs = require('fs');
var http = require('http');
var https = require('https');
var util = require('util');
var domain = require('domain');
var glob = require('glob');

var DirectoryReader = require('./readers/directory_reader.js');
var FileReader = require('./readers/file_reader.js');
var CommandReader = require('./readers/command_reader.js');
var MultiFileReader = require('./readers/multi_file_reader.js');
var StringReader = require('./readers/string_reader');
var FilterManager = require('./filter_manager.js');

var PREFIX_FILES = '/files/';
var PREFIX_COMMANDS = '/commands/';
var PREFIX_CONFIG = '/config';
var PREFIX_HELP = '/help';
var PREFIX_VERSION = '/version';

var CONFIG = {
  ssl: false,
  ssl_key: '',
  ssl_cert: '',
  port: 9280,
  locations: [],
  forbiddens: [],
  users: [],
  commands: {},
  config_visible: false,
  refresh_always: 0,
  default_filters: '',
}

var RX_REFRESH = /^refresh=([1-9]\d*)$/;

function Server(conffile, verbose)
{
  var config = loadConfig(conffile);
  var httpServer = createServer(config, handleRequestWithDomain);
  var isAllowedUser = newUserChecker(config.users);
  var isAllowedLocation = newLocationChecker(config.locations,
      config.forbiddens);

  this.config = config;
  this.httpServer = httpServer;
  this.verbose = verbose;

  function versionString() {
    return PACKAGE.name + '/' + PACKAGE.version;
  }

  function newHeader(base) {
    var common = {
      'Server': versionString(),
    };
    if (base) {
      for (name in base) {
        common[name] = base[name];
      }
    }
    return common;
  }

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
      response.writeHead(500, newHeader());
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
      response.writeHead(401, newHeader({
        'WWW-Authenticate': 'Basic realm="night - filtered file server"'
      }));
      response.end('Disallow guests access');
    } else if (request.url.indexOf(PREFIX_FILES) == 0) {
      handleFileResource(request, response);
    } else if (request.url.indexOf(PREFIX_COMMANDS) == 0) {
      handleCommandResource(request, response);
    } else if (request.url.indexOf(PREFIX_CONFIG) == 0) {
      handleConfigResource(request, response);
    } else if (request.url.indexOf(PREFIX_HELP) == 0) {
      handleHelpResource(request, response);
    } else if (request.url.indexOf(PREFIX_VERSION) == 0) {
      handleVersionResource(request, response);
    } else {
      response.writeHead(404, newHeader());
      response.end();
    }
  }

  function handleVersionResource(request, response) {
    var reader = new StringReader(versionString());
    transfer(request, response, reader);
  }

  function handleHelpResource(request, response)
  {
    var reader = new FileReader(__dirname + '/../README.mkd');
    transfer(request, response, reader);
  }

  function handleConfigResource(request, response)
  {
    if (!config.config_visible) {
      response.writeHead(403, newHeader());
      response.end('Forbidden by config_visible parameter.');
      return;
    }
    var reader = new StringReader(JSON.stringify(config, null, 2));
    transfer(request, response, reader);
  }

  function handleCommandResource(request, response)
  {
    var data = getCommandResourceData(request.url);
    if (data.error) {
      response.writeHead(404, newHeader());
      response.end('Unknown or invalid command: ' + data.name);
      return;
    }
    var reader = new CommandReader(data.cmd, data.args);
    transfer(request, response, reader);
  }

  function handleFileResource(request, response)
  {
    var path = getFileResourcePath(request.url);
    if (hasWildcard(path)) {
      handleGlobFileResource(request, response, path);
      return;
    } else if (!isAllowedLocation(path)) {
      response.writeHead(403, newHeader());
      response.end('Disallow to access: ' + path);
      return;
    }
    fs.stat(path, request.domain.bind(function(err, stats) {
      if (err) {
        response.writeHead(404, newHeader());
        response.end('stat failed: ' + err.message);
        return;
      } else if (stats.isFile()) {
        transfer(request, response, new FileReader(path));
      } else if (stats.isDirectory()) {
        transfer(request, response, new DirectoryReader(path));
      } else {
        response.writeHead(404, newHeader());
        response.end('Not a file');
      }
    }));
  }

  function handleGlobFileResource(request, response, pattern)
  {
    glob(pattern, {}, function(err, files) {
      if (err) {
        response.writeHead(404, newHeader());
        response.end('glob failed: ' + err.message);
        return;
      }
      files = files.filter(isAllowedLocation);
      if (files.length == 0) {
        response.writeHead(404, newHeader());
        response.end('glob not match: ' + pattern);
        return;
      } else {
        transfer(request, response, new MultiFileReader(files));
      }
    });
  }

  function getRefreshValue(param)
  {
    return param.refresh > 0 ? param.refresh : config.refresh_always;
  }

  function transfer(request, response, source)
  {
    var param = parseQueryString(request.url);
    var filtered = FilterManager.applyFilterSpec(source, param.filterSpec);
    // Apply default_filters.
    if (filtered === source && config.default_filters) {
      filtered = FilterManager.applyFilterSpec(source,
          config.default_filters);
    }
    if (filtered === source) {
      var f = getDefaultFilter(request);
      if (f != null) {
        filtered = FilterManager.applyFilterSpec(source, f);
      }
    }
    // set domain to emitters.
    request.domain.add(source);
    request.domain.add(filtered);
    // Prepare HTTP response header.
    var header = {
      'Content-Type': 'text/plain'
    };
    refresh = getRefreshValue(param);
    if (refresh > 0) {
      header['Refresh'] =
        util.format('%d; URL=%s', refresh, request.url);
    }
    // transfer all lines to the response.
    response.writeHead(200, newHeader(header));
    filtered.on('line', function(line) {
      response.write(line);
      response.write('\n');
    });
    filtered.on('end', function() {
      response.end();
    });
  }

  // Get default filter for request.
  function getDefaultFilter(request)
  {
    // Simple string default filters will be applied to files only.
    if (typeof config.default_filters === 'string') {
      if (request.url.indexOf(PREFIX_FILES) == 0) {
        return config.default_filters;
      } else {
        return null;
      }
    }

    // Default filters table are applied to url which starts with key.
    for (var path in config.default_filters) {
      if (request.url.indexOf(path) == 0) {
        return config.default_filters[path];
      }
    }
    return null;
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
    return index >= 0 ? url.substring(index + 1) : ''
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

  function hasWildcard(path)
  {
    return path.indexOf('*') >= 0 ? true : false;
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
