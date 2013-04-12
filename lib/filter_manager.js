// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports.applyFilterSpec = applyFilterSpec;

var Head = require('./filters/head_filter.js');
var Tail = require('./filters/tail_filter.js');
var Grep = require('./filters/grep_filter.js');
var Cut = require('./filters/cut_filter.js');
var Hash = require('./filters/hash_filter.js');
var Count = require('./filters/count_filter.js');
var LTSV = require('./filters/ltsv_filter.js');

var FILTERS = {
  'cut': Cut,
  'grep': Grep,
  'head': Head,
  'tail': Tail,
  'hash': Hash,
  'count': Count,
  'ltsv': LTSV,
}

function parseAsFilterFactory(str)
{
  var subparts = str.split('=', 2);
  var name = subparts[0];
  var options = subparts.length >= 2 ? parseFilterOptions(subparts[1]) : null;
  if (name in FILTERS) {
    return newFilterFactory(FILTERS[name], options);
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

function parseFilterSpec(spec)
{
  var filters = [];
  var parts = spec.split('&');
  for (var i = 0, len = parts.length; i < len; ++i) {
    var name = parts[i];
    if (name.length == 0) {
      continue;
    }
    var factory = parseAsFilterFactory(name);
    if (factory) {
      filters.push(factory);
    } else {
      throw new Error('Unknown filter - ' + name);
    }
  }
  return filters;
}

function applyFilterSpec(source, spec)
{
  var filters = parseFilterSpec(spec);
  return applyFilters(source, filters);
}
