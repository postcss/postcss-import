var fs = require("fs")

module.exports = function(filename) {
  return new Promise(function(resolve, reject) {
    fs.readFile(filename, "utf-8", function(err, data) {
      if (err) {
        return reject(err)
      }
      resolve(data)
    })
  })
}
