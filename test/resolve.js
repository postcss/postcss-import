// external tooling
import test from "ava"

// internal tooling
import checkFixture from "./helpers/check-fixture"

test("should resolve relative to cwd", checkFixture, "resolve-cwd", {
  path: null,
})

test(`should resolve relative to 'root' option`, checkFixture, "resolve-root", {
  root: "test/fixtures",
  path: null,
})

test(
  `should resolve relative to postcss 'from' option`,
  checkFixture,
  "resolve-from",
  { path: null },
  { from: "test/fixtures/file.css" }
)

test(
  `should resolve relative to 'path' which resolved with cwd`,
  checkFixture,
  "resolve-path-cwd",
  { path: "test/fixtures/imports" }
)

test(
  `should resolve relative to 'path' which resolved with 'root'`,
  checkFixture,
  "resolve-path-root",
  { root: "test/fixtures", path: "imports" }
)

test("should resolve local modules", checkFixture, "resolve-local-modules", {
  path: null,
})

test("should resolve local modules", checkFixture, "resolve-path-modules", {
  path: "test/fixtures/imports/modules",
})

test(
  "should be able to consume npm package or local modules",
  checkFixture,
  "resolve-modules",
  { path: null },
  { from: "test/fixtures/imports/foo.css" }
)

test(
  "should be able to consume npm sub packages",
  checkFixture,
  "resolve-npm-subpackages",
  { path: null },
  { from: "test/fixtures/imports/foo.css" }
)

test(
  "should be able to consume modules from custom modules directories",
  checkFixture,
  "resolve-custom-modules",
  { path: null, addModulesDirectories: ["shared_modules"] },
  { from: "test/fixtures/imports/foo.css" }
)
