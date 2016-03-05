var readCache = require("read-cache")
var request = require("request")

module.exports = function(location) {
  if (/^(https?:)?\/\//i.test(location)) {
    if (location.startsWith("//")) {
      location = "http:" + location
    }

    return new Promise(function(resolve, reject) {
      request(location, function(error, response, body) {
        if (error) {
          reject(error)
        }
        else {
          resolve(body)
        }
      })
    })
  }

  else {
    return readCache(location, "utf-8")
  }
}
