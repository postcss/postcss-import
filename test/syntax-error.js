"use strict"
// builtin tooling
const fs = require("fs")

// external tooling
const test = require("ava")
const postcss = require("postcss")

// plugin
const atImport = require("..")

test("SyntaxError in imported file throws", t => {
  return postcss(atImport({ path: "test/fixtures/imports" }))
    .process(fs.readFileSync("test/fixtures/syntax-error.css", "utf8"), {
      from: undefined,
    })
    .then(() => t.fail("should error out"))
    .catch(err => t.truthy(err))
})
