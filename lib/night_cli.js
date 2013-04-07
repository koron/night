// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports.start = start;

var Getopt = require('node-getopt');
var NightServer = require('./night_server.js');

function start()
{
  var getopt = new Getopt([
      ['c', 'config=FILE',   'configuration file' ],
      ['v', 'verbose',  'verbose message' ],
      ['h', 'help',     'display this help' ],
      ])
    .bindHelp()
    .parseSystem();

  var options = getopt.options;
  var server = new NightServer.Server(options.config, options.verbose);
  server.start();
  return server;
}
