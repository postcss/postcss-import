var readCache = require("read-cache")

module.exports = function(filename) {
  return readCache(filename, "utf-8")
}
