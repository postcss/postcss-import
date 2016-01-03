import test from "ava"
import compareFixtures from "./lib/compare-fixtures"
import path from "path"
import glob from "glob"

test("should handle a glob pattern", t => {
  return compareFixtures(t, "glob", {
    glob: true,
  })
})

test("should handle glob in base dir", t => {
  return compareFixtures(t, "glob-base", {
    path: [],
    glob: true,
  }, {
    from: "fixtures/glob-base.css",
  })
})

test("should fail silently, skipping the globbed import," +
  " if no files found", t => {
  return compareFixtures(t, "glob-missing", {
    glob: true,
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
