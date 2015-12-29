import test from "ava"
import postcss from "postcss"
import atImport from ".."
import compareFixtures from "./lib/compare-fixtures"
import { readFileSync } from "fs"
import path from "path"
import glob from "glob"

test("should handle a glob pattern", t => {
  return compareFixtures(t, "glob", {
    root: ".",
    glob: true,
  })
})

test("should handle a glob pattern with single quote and/or url(...)", t => {
  return compareFixtures(t, "glob-alt", {
    glob: true,
  })
})

test("should fail silently, skipping the globbed import," +
  " if no files found", t => {
  var file = "fixtures/imports/glob-missing.css"
  return postcss()
    .use(atImport({ glob: true }))
    .process(readFileSync(file), { from: file })
    .then(result => {
      t.is(result.css, "foobar{}\n")
    })
})

test("should handle a glob by custom resolver", t => {
  return compareFixtures(t, "glob-resolve", {
    resolve: (id, base) => {
      return glob.sync(path.resolve(base, id))
    },
  }, {
    from: "fixtures/glob-resolve.css",
  })
})
