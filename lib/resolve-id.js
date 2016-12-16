var resolve = require("resolve")
var jspmResolve
// Works around https://github.com/jspm/jspm-cli/pull/1779 is released
try {
  jspmResolve = require("pkg-resolve")
}
catch (ex) {
  // pass
}

var moduleDirectories = [
  "web_modules",
  "node_modules",
]

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
    moduleDirectory: moduleDirectories.concat(options.addModulesDirectories),
    paths: paths,
    extensions: [ ".css" ],
    packageFilter: function processPackage(pkg) {
      if (pkg.style) {
        pkg.main = pkg.style
      }
      else if (!pkg.main || !/\.css$/.test(pkg.main)) {
        pkg.main = "index.css"
      }
      return pkg
    },
  }

  return resolveModule("./" + id, resolveOpts)
  .catch(function() {
    return resolveModule(id, resolveOpts)
  })
  .catch(function() {
    return jspmResolve.default(id, {
      basedir: resolveOpts.basedir,
      extensions : resolveOpts.extensions,
    })
  })
  .catch(function() {
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
}
