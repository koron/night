// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports.applyFilterSpec = applyFilterSpec;

var Head = require('./head_filter.js');
var Tail = require('./tail_filter.js');
var Grep = require('./grep_filter.js');
var Cut = require('./cut_filter.js');
var Hash = require('./hash_filter.js');

var FILTERS = {
  'cut': Cut,
  'grep': Grep,
  'head': Head,
  'tail': Tail,
  'hash': Hash,
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
    var factory = parseAsFilterFactory(parts[i]);
    if (factory) {
      filters.push(factory);
    } else {
      // TODO: show error.
    }
  }
  return filters;
}

function applyFilterSpec(source, spec)
{
  var filters = parseFilterSpec(spec);
  return applyFilters(source, filters);
}
