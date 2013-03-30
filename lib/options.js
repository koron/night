// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports = Options;

function Options(defval, userval)
{
  for (var key in defval) {
    if (userval && userval.hasOwnProperty(key)) {
      this[key] = userval[key];
    } else {
      this[key] = defval[key];
    }
  }
}
