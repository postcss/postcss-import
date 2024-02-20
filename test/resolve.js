"use strict"
// external tooling
const test = require("ava")
const fs = require("fs")
const path = require("path")

// internal tooling
const checkFixture = require("./helpers/check-fixture")

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
  { from: "test/fixtures/file.css" },
)

test(
  `should resolve relative to 'path' which resolved with cwd`,
  checkFixture,
  "resolve-path-cwd",
  { path: "test/fixtures/imports" },
)

test(
  `should resolve relative to 'path' which resolved with 'root'`,
  checkFixture,
  "resolve-path-root",
  { root: "test/fixtures", path: "imports" },
)

test("should resolve local modules", checkFixture, "resolve-local-modules", {
  path: null,
})

test(
  "should resolve modules with path option",
  checkFixture,
  "resolve-path-modules",
  {
    path: "test/fixtures/imports/modules",
  },
)

test(
  "should be able to consume npm package or local modules",
  checkFixture,
  "resolve-modules",
  { path: null },
  { from: "test/fixtures/imports/foo.css" },
)

test(
  "should be able to consume npm sub packages",
  checkFixture,
  "resolve-npm-subpackages",
  { path: null },
  { from: "test/fixtures/imports/foo.css" },
)

test(
  "should be able to consume modules from custom modules directories",
  checkFixture,
  "resolve-custom-modules",
  { path: null, addModulesDirectories: ["shared_modules"] },
  { from: "test/fixtures/imports/foo.css" },
)

test(
  "should resolve modules with node subpath imports with a custom resolver",
  checkFixture,
  "subpath",
  {
    resolve: (id, basedir) => {
      // see: https://nodejs.org/api/packages.html#subpath-imports
      if (id.startsWith("#")) {
        const pkgJSON = JSON.parse(
          fs.readFileSync(path.join(basedir, "package.json")),
        )

        return path.join(basedir, pkgJSON.imports[id])
      }

      return id
    },
    path: "test/fixtures/imports/modules",
  },
)
