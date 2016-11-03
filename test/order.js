import test from "ava"
import compareFixtures from "./helpers/compare-fixtures"

test(`should order nested imports correctly`, t => {
  var first = true
  var path = require("path")

  return compareFixtures(t, "order", {
    path: "fixtures/imports",
    resolve: (id) => {
      return new Promise(function(res) {
        var doResolve = () => res(path.resolve("fixtures/imports", id))

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
