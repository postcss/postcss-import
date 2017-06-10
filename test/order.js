// external tooling
import test from "ava"

// internal tooling
import checkFixture from "./helpers/check-fixture"

test(`should order nested imports correctly`, t => {
  let first = true
  const path = require("path")

  return checkFixture(t, "order", {
    path: "test/fixtures/imports",
    resolve: id => {
      return new Promise(res => {
        const doResolve = () => res(path.resolve("test/fixtures/imports", id))

        if (first) {
          // Delay the first import so the second gets loaded first
          setTimeout(doResolve, 100)
          first = false
        } else doResolve()
      })
    },
  })
})
