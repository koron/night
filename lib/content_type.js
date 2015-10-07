module.exports.guess = guess;
module.exports.Type = Type;

var path = require('path');

function Type(contentType, isBinary) {
  this.contentType = contentType;
  this.isBinary = isBinary;
  return this;
}

function guess(filepath) {
  var ext = path.extname(filepath).toLowerCase();
  var t
  switch (ext) {

    case '.png':
      return new Type('image/png', true);

    case '.jpg': case '.jpeg':
      return new Type('image/jpeg', true);

    case '.gif':
      return new Type('image/gif', true);

    case '.txt':
      return new Type('text/plain', false);

    default:
      return new Type('text/plain', false);

  }
}
