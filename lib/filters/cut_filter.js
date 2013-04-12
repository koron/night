// vim:set ts=8 sts=2 sw=2 tw=0 et:

module.exports = CutFilter;

var LineStream = require('../line_stream.js');
var Options = require('../options.js');
var util = require('util');

util.inherits(CutFilter, LineStream);

function CutFilter(lineStream, options)
{
  this.name = 'cut';
  this.source = lineStream;

  var merged = new Options({
    delim: '\t',
    list: null,
  }, options);

  var emitter = this;
  var delim = merged.delim;
  var selectors = toSelectors(merged.list);

  if (selectors.length == 0) {
    lineStream.on('line', function(line) {
      emitter.emit_line(line);
    });
  } else {
    lineStream.on('line', function(line) {
      var raw = line.split(delim);
      var selected = []
      for (var i = 0, len = selectors.length; i < len; ++i) {
        selectors[i](selected, raw);
      }
      emitter.emit_line(selected.join(delim));
    });
  }

  lineStream.on('end', function() {
    emitter.emit_end();
  });

  LineStream.call(this);
}

var SELECT_ONE = /^[1-9]\d*$/;
var SELECT_RANGE = /^([1-9]\d*)-([1-9]\d*)$/
var SELECT_RANGE_BEGIN = /^([1-9]\d*)-$/
var SELECT_RANGE_END = /^-([1-9]\d*)$/

function toSelectors(raw)
{
  if (!raw) {
    return [];
  }
  var selectors = [];
  var items = raw.split(',');
  for (var i = 0, len = items.length; i < len; ++i) {
    var item = items[i];
    var m;
    if (m = SELECT_ONE.exec(item)) {
      selectors.push(selectOne(parseIndex(item)));
    } else if (m = SELECT_RANGE.exec(item)) {
      selectors.push(selectRange(parseIndex(m[1]), parseIndex(m[2])));
    } else if (m = SELECT_RANGE_BEGIN.exec(item)) {
      selectors.push(selectRangeBegin(parseIndex(m[1])));
    } else if (m = SELECT_RANGE_END.exec(item)) {
      selectors.push(selectRangeEnd(parseIndex(m[1])));
    }
  }
  return selectors;
}

function parseIndex(value)
{
  return parseInt(value) - 1;
}

function selectOne(target)
{
  return function(out, items) {
    out.push(items[target]);
  }
}

function selectRange(start, end) {
  if (start <= end) {
    return function(out, items) {
      var s = start >= 0 ? start : 0;
      var e = end < items.length ? end : items.length - 1;
      for (var i = s; i <= e; ++i) {
        out.push(items[i]);
      }
    }
  } else {
    return function(out, items) {
      var e = end >= 0 ? end : 0;
      var s = start < items.length ? start : items.length - 1;
      for (var i = s; i >= e; --i) {
        out.push(items[i]);
      }
    }
  }
}

function selectRangeBegin(start) {
  return function(out, items) {
    var s = start < items.length ? start : items.length;
    for (var i = s, len = items.length; i < len; ++i) {
      out.push(items[i]);
    }
  }
}

function selectRangeEnd(end) {
  return function(out, items) {
    var e = end < items.length ? end : items.length - 1;
    for (var i = 0; i <= e; ++i) {
      out.push(items[i]);
    }
  }
}
