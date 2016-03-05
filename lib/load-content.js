var readCache = require("read-cache")
var rp = require("request-promise")
var isRemote = require("./is-remote")

module.exports = function(location) {
  if (isRemote(location)) {
    return rp(location)
  }

  else {
    return readCache(location, "utf-8")
  }
}
