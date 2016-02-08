import test from "ava"
import compareFixtures from "./helpers/compare-fixtures"

test(`should order nested imports correctly`, t => {
  var first = true
  var resolve = require("resolve")

  return compareFixtures(t, "order", {
    path: "fixtures/imports",
    resolve: (id, base, opts) => {
      var resolveOpts = {
        basedir: base,
        moduleDirectory: [],
        paths: opts.path,
        extensions: [ ".css" ],
      }

      return new Promise(function(res, rej) {
        var doResolve = () => {
          resolve(id, resolveOpts, function(err, path) {
            if (err) {
              return rej(err)
            }
            res(path)
          })
        }

        if (first) {
          // Delay the first import so the second gets loaded first
          setTimeout(doResolve, 100)
          first = false
        }
        else {
          doResolve()
        }
      })
    },
  })
})
