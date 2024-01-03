"use strict"
// builtin tooling
const path = require("path")

// external tooling
const test = require("ava")
const postcss = require("postcss")

// plugin
const atImport = require("..")

// internal tooling
const checkFixture = require("./helpers/check-fixture")

test.serial("should accept file", checkFixture, "custom-resolve-file", {
  resolve: () => path.resolve("test/fixtures/imports/custom-resolve-1.css"),
})

test.serial(
  "should accept promised file",
  checkFixture,
  "custom-resolve-file",
  {
    resolve: () => {
      return Promise.resolve(
        path.resolve("test/fixtures/imports/custom-resolve-1.css"),
      )
    },
  },
)

test.serial(
  "should accept array of files",
  checkFixture,
  "custom-resolve-array",
  {
    resolve: () => {
      return [
        path.resolve("test/fixtures/imports/custom-resolve-1.css"),
        path.resolve("test/fixtures/imports/custom-resolve-2.css"),
        path.resolve("test/fixtures/imports/custom-resolve-1.css"),
      ]
    },
  },
)

test.serial(
  "should accept promised array of files",
  checkFixture,
  "custom-resolve-array",
  {
    resolve: () => {
      return Promise.resolve([
        path.resolve("test/fixtures/imports/custom-resolve-1.css"),
        path.resolve("test/fixtures/imports/custom-resolve-2.css"),
        path.resolve("test/fixtures/imports/custom-resolve-1.css"),
      ])
    },
  },
)

test("should apply default resolver when custom doesn't return an absolute path", t => {
  return postcss()
    .use(
      atImport({
        resolve: path => path.replace("foo", "imports/bar"),
        load: p => {
          t.is(p, path.resolve("test/fixtures/imports", "bar.css"))
          return "/* comment */"
        },
      }),
    )
    .process(`@import "foo.css";`, {
      from: "test/fixtures/custom-resolve-file",
    })
    .then(result => t.is(result.css, "/* comment */"))
})
