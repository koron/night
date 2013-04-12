// vim:set ts=8 sts=2 sw=2 tw=0 et:

module.exports = LTSVCutFilter;

var LineStream = require('../line_stream.js');
var Options = require('../options.js');
var util = require('util');

util.inherits(LTSVCutFilter, LineStream);

function LTSVCutFilter(lineStream, options)
{
  this.name = 'ltsv_cut';
  this.source = lineStream;

  var merged = new Options({
    list: null,
  }, options);

  var emitter = this;
  var labels = toLabels(merged.list);

  if (labels.length == 0) {
    lineStream.on('line', function(line) {
      emitter.emit_line(line);
    });
  } else {
    lineStream.on('line', function(line) {
      var values = parseLTSV(line);
      var selected = selectValues(labels, values);
      emitter.emit_line(selected.join('\t'));
    });
  }

  lineStream.on('end', function() {
    emitter.emit_end();
  });

  LineStream.call(this);
}

function toLabels(raw)
{
  return raw ? raw.split(',') : [];
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

function parseLTSV(str)
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
