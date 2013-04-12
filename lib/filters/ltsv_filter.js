// vim:set ts=8 sts=2 sw=2 tw=0 et:

module.exports = LTSVFilter;

var LineStream = require('../line_stream.js');
var Options = require('../options.js');
var util = require('util');

util.inherits(LTSVFilter, LineStream);

function LTSVFilter(lineStream, options)
{
  this.name = 'ltsv_cut';
  this.source = lineStream;

  var merged = new Options({
    grep: null,
    match: true,
    cut: null,
  }, options);

  var emitter = this;
  var isMatch = newMatcher(merged.grep, JSON.parse(merged.match));
  var filter = newFilter(merged.cut);

  lineStream.on('line', function(line) {
    var ltsv = parseAsLTSV(line);
    if (isMatch(ltsv)) {
      var filtered = filter(ltsv);
      emitter.emit_line(formatAsLTSV(filtered));
    }
  });

  lineStream.on('end', function() {
    emitter.emit_end();
  });

  LineStream.call(this);
}

function selectValues(labels, values)
{
  var selected = [];
  for (var i = 0, i_len = labels.length; i < i_len; ++i) {
    var label = labels[i];
    var value = values[label];
    if (value && value.length > 0) {
      selected.push(label + ':' + value[0]);
    }
  }
  return selected;
}

function newMatcher(matchStr, match)
{
  var matches = matchStr ? matchStr.split(',', 2) : [];
  if (matches.length < 2) {
    return function(ltsv) {
      return true;
    };
  } else {
    var label = matches[0];
    var re = new RegExp(matches[1]);
    return function(ltsv) {
      var values = ltsv[label];
      if (values) {
        for (var i = 0, len = values.length; i < len; ++i) {
          if (values[i].search(re) >= 0) {
            return match;
          }
        }
      }
      return !match;
    };
  }
}

function newFilter(filterStr)
{
  var labels = filterStr ? filterStr.split(',') : [];
  if (labels.length == 0) {
    return function(ltsv) {
      return ltsv;
    };
  } else {
    return function(ltsv) {
      var filtered = {};
      for (var i = 0, len = labels.length; i < len; ++i) {
        var label = labels[i];
        var value = ltsv[label];
        if (value) {
          filtered[label] = value;
        }
      }
      return filtered;
    };
  }
}

function parseAsLTSV(str)
{
  var values = {};
  var parts = str.split('\t');
  for (var i = 0, len = parts.length; i < len; ++i) {
    var part = parts[i];
    // extract label and value.
    var index = part.indexOf(':');
    if (index < 1) {
      continue;
    }
    var label = part.substring(0, index);
    var value = part.substring(index + 1);
    // put into values.
    var slot = values[label];
    if (!slot) {
      slot = values[label] = [];
    }
    slot.push(value);
  }
  return values;
}

function formatAsLTSV(ltsv)
{
  var parts = [];
  for (var label in ltsv) {
    var values = ltsv[label];
    for (var i = 0, len = values.length; i < len; ++i) {
      parts.push(label + ':' + values[i]);
    }
  }
  return parts.join('\t');
}
