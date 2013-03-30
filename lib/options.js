// vim:set ts=8 sts=2 sw=2 tw=0:

module.exports = Options;

function check(defval, userval)
{
  for (var name in userval) {
    if (userval.hasOwnProperty(name) && !(name in defval)) {
      throw new Error('Unknown option: ' + name);
    }
  }
  return true;
}

function Options(defval, userval)
{
  check(defval, userval);
  for (var key in defval) {
    if (userval && userval.hasOwnProperty(key)) {
      this[key] = userval[key];
    } else {
      this[key] = defval[key];
    }
  }
}
