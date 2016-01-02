var fs = require("fs")
var path = require("path")
var glob = require("glob")
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

function resolveGlob(patterns) {
  var files = []
  var promises = patterns.map(function(pattern) {
    return new Promise(function(resolve, reject) {
      glob(pattern, function(err, result) {
        if (err) {
          return reject(err)
        }
        files = files.concat(result)
        resolve()
      })
    })
  })
  return Promise.all(promises).then(function() {
    return files
  })
}

module.exports = function(id, base, options) {
  var paths = options.path

  if (options.glob && glob.hasMagic(id)) {
    // Remove moduleDirectories from paths
    var patterns = paths.concat(moduleDirectories).map(function(p) {
      return path.resolve(base, p, id)
    })
    return resolveGlob(patterns)
  }

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
  return resolveModule(id, resolveOpts).catch(function() {
    // fix to try relative files on windows with "./"
    // if it's look like it doesn't start with a relative path already
    // if (id.match(/^\.\.?/)) {throw e}
    return resolveModule("./" + id, resolveOpts)
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
