import test from "ava"
import compareFixtures from "./lib/compare-fixtures"

test("should resolve relative to cwd", t => {
  return compareFixtures(t, "resolve-cwd", {
    path: null,
  })
})

test(`should resolve relative to 'root' option`, t => {
  return compareFixtures(t, "resolve-root", {
    root: "fixtures",
    path: null,
  })
})

test(`should resolve relative to postcss 'from' option`, t => {
  return compareFixtures(t, "resolve-from", {
    path: null,
  }, {
    from: "fixtures/file.css",
  })
})

test(`should resolve relative to 'path' which resolved with cwd`, t => {
  return compareFixtures(t, "resolve-path-cwd", {
    path: "fixtures/imports",
  })
})

test(`should resolve relative to 'path' which resolved with 'root'`, t => {
  return compareFixtures(t, "resolve-path-root", {
    root: "fixtures",
    path: "imports",
  })
})

test("should resolve local modules", t => {
  return compareFixtures(t, "resolve-local-modules", {
    path: null,
  })
})

test("should resolve local modules", t => {
  return compareFixtures(t, "resolve-path-modules", {
    path: "fixtures/imports/modules",
  })
})

test("should be able to consume npm package or local modules", t => {
  return compareFixtures(t, "resolve-modules", {
    path: null,
  }, {
    from: "fixtures/imports/foo.css",
  })
})
