import test from "ava"
import compareFixtures from "./helpers/compare-fixtures"
import postcss from "postcss"
import atImport from ".."
import path from "path"

test.serial("should accept file", t => {
  return compareFixtures(t, "custom-resolve-file", {
    resolve: () => {
      return path.resolve("fixtures/imports/custom-resolve-1.css")
    },
  })
})

test.serial("should accept promised file", t => {
  return compareFixtures(t, "custom-resolve-file", {
    resolve: () => {
      return Promise.resolve(
        path.resolve("fixtures/imports/custom-resolve-1.css")
      )
    },
  })
})

test.serial("should accept array of files", t => {
  return compareFixtures(t, "custom-resolve-array", {
    resolve: () => {
      return [
        path.resolve("fixtures/imports/custom-resolve-1.css"),
        path.resolve("fixtures/imports/custom-resolve-2.css"),
        path.resolve("fixtures/imports/custom-resolve-1.css"),
      ]
    },
  })
})

test.serial("should accept promised array of files", t => {
  return compareFixtures(t, "custom-resolve-array", {
    resolve: () => {
      return Promise.resolve([
        path.resolve("fixtures/imports/custom-resolve-1.css"),
        path.resolve("fixtures/imports/custom-resolve-2.css"),
        path.resolve("fixtures/imports/custom-resolve-1.css"),
      ])
    },
  })
})

test(
  "should apply default resolver when custom doesn't return an absolute path",
  function(t) {
    return postcss()
    .use(atImport({
      resolve: path => {
        return path.replace("foo", "imports/bar")
      },
      load: p => {
        t.is(p, path.resolve("fixtures/imports", "bar.css"))
        return "/* comment */"
      },
    }))
    .process(`@import "foo.css";`, { from: "fixtures/custom-resolve-file" })
    .then(result => {
      t.is(result.css, "/* comment */")
    })
  }
)
