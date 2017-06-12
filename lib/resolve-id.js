"use strict"

// external tooling
const resolve = require("resolve")

const moduleDirectories = ["web_modules", "node_modules"]

function resolveModule(id, opts) {
  if (opts.sync) {
    return resolve.sync(id, opts)
  }
  return new Promise((res, rej) => {
    resolve(id, opts, (err, path) => (err ? rej(err) : res(path)))
  })
}

function pathNotFound(id, paths, base) {
  if (!~paths.indexOf(base)) {
    paths.unshift(base)
  }

  throw new Error(
    `Failed to find '${id}'
in [
  ${paths.join(",\n        ")}
]`
  )
}

module.exports = function(id, base, options) {
  const paths = options.path

  const resolveOpts = {
    basedir: base,
    moduleDirectory: moduleDirectories.concat(options.addModulesDirectories),
    paths: paths,
    sync: options.sync,
    extensions: [".css"],
    packageFilter: function processPackage(pkg) {
      if (pkg.style) pkg.main = pkg.style
      else if (!pkg.main || !/\.css$/.test(pkg.main)) pkg.main = "index.css"
      return pkg
    },
  }

  if (options.sync) {
    try {
      return resolveModule(`./${id}`, resolveOpts)
    } catch (_e) {
      try {
        return resolveModule(id, resolveOpts)
      } catch (_e) {
        pathNotFound(id, paths, base)
      }
    }
  }

  return resolveModule(`./${id}`, resolveOpts)
    .catch(() => resolveModule(id, resolveOpts))
    .catch(() => pathNotFound(id, paths, base))
}
