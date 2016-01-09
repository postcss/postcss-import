var fs = require("fs")
var path = require("path")
var resolve = require("resolve")

var moduleDirectories = [
  "web_modules",
  "node_modules",
]

function isFile(path) {
  return new Promise(function(resolve, reject) {
    fs.stat(path, function(err, stat) {
      if (err) {
        if (err.code === "ENOENT") {
          return resolve(false)
        }
        return reject(err)
      }
      resolve(stat.isFile() || stat.isFIFO())
    })
  })
}

function resolveModule(id, opts) {
  return new Promise(function(res, rej) {
    resolve(id, opts, function(err, path) {
      if (err) {
        return rej(err)
      }
      res(path)
    })
  })
}

module.exports = function(id, base, options) {
  var paths = options.path

  var resolveOpts = {
    basedir: base,
    moduleDirectory: moduleDirectories,
    paths: paths,
    extensions: [ ".css" ],
    packageFilter: function processPackage(pkg) {
      pkg.main = pkg.style || "index.css"
      return pkg
    },
  }

  // local detect
  return resolveModule("./" + id, resolveOpts).catch(function() {
    // modules and paths detect
    return resolveModule(id, resolveOpts)
  }).catch(function() {
    // LAST HOPE
    return Promise.all(paths.map(function(p) {
      return isFile(path.resolve(p, id))
    })).then(function(results) {
      for (var i = 0; i < results.length; i += 1) {
        if (results[i]) {
          return path.resolve(paths[i], id)
        }
      }

      if (paths.indexOf(base) === -1) {
        paths.unshift(base)
      }

      throw new Error([
        "Failed to find '" + id + "'",
        "in [ ",
        "    " + paths.join(",\n        "),
        "]",
      ].join("\n    "))
    })
  })
}
