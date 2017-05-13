// builtin tooling
import path from "path"

// external tooling
import test from "ava"
import postcss from "postcss"

// internal tooling
import compareFixtures from "./helpers/compare-fixtures"

// plugin
import atImport from ".."

test.serial("should accept file", t => {
  return compareFixtures(t, "custom-resolve-file", {
    resolve: () => path.resolve("test/fixtures/imports/custom-resolve-1.css"),
  })
})

test.serial("should accept promised file", t => {
  return compareFixtures(t, "custom-resolve-file", {
    resolve: () => {
      return Promise.resolve(
        path.resolve("test/fixtures/imports/custom-resolve-1.css")
      )
    },
  })
})

test.serial("should accept array of files", t => {
  return compareFixtures(t, "custom-resolve-array", {
    resolve: () => {
      return [
        path.resolve("test/fixtures/imports/custom-resolve-1.css"),
        path.resolve("test/fixtures/imports/custom-resolve-2.css"),
        path.resolve("test/fixtures/imports/custom-resolve-1.css"),
      ]
    },
  })
})

test.serial("should accept promised array of files", t => {
  return compareFixtures(t, "custom-resolve-array", {
    resolve: () => {
      return Promise.resolve([
        path.resolve("test/fixtures/imports/custom-resolve-1.css"),
        path.resolve("test/fixtures/imports/custom-resolve-2.css"),
        path.resolve("test/fixtures/imports/custom-resolve-1.css"),
      ])
    },
  })
})

test("should apply default resolver when custom doesn't return an absolute path", t => {
  return postcss()
    .use(
      atImport({
        resolve: path => path.replace("foo", "imports/bar"),
        load: p => {
          t.is(p, path.resolve("test/fixtures/imports", "bar.css"))
          return "/* comment */"
        },
      })
    )
    .process(`@import "foo.css";`, {
      from: "test/fixtures/custom-resolve-file",
    })
    .then(result => t.is(result.css, "/* comment */"))
})
