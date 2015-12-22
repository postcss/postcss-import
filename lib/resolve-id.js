var fs = require("fs")
var path = require("path")
var resolve = require("resolve")

var moduleDirectories = [
  "web_modules",
  "node_modules",
]

module.exports = function(id, base, paths) {
  try {
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
    var file
    try {
      file = resolve.sync(id, resolveOpts)
    }
    catch (e) {
      // fix to try relative files on windows with "./"
      // if it's look like it doesn't start with a relative path already
      // if (id.match(/^\.\.?/)) {throw e}
      try {
        file = resolve.sync("./" + id, resolveOpts)
      }
      catch (err) {
        // LAST HOPE
        if (!paths.some(function(dir) {
          file = path.join(dir, id)
          return fs.existsSync(file)
        })) {
          throw err
        }
      }
    }

    return path.normalize(file)
  }
  catch (e) {
    throw new Error([
      "Failed to find '" + id + "'",
      "in [ ",
      "    " + paths.join(",\n        "),
      "]",
    ].join("\n    "))
  }
}
