module.exports.guess = guess;
module.exports.Type = Type;

var path = require('path');

function Type(contentType, isBinary, filepath) {
  this.contentType = contentType;
  this.isBinary = isBinary;
  this.filepath = filepath;
  return this;
}

function guess(filepath) {
  var ext = path.extname(filepath).toLowerCase();
  var t
  switch (ext) {

    case '.png':
      return new Type('image/png', true, filepath);

    case '.jpg': case '.jpeg':
      return new Type('image/jpeg', true, filepath);

    case '.gif':
      return new Type('image/gif', true, filepath);

    case '.txt':
      return new Type('text/plain', false, filepath);

    default:
      return new Type('text/plain', false, filepath);

  }
}
