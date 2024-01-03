"use strict"
// builtin tooling
const { readFileSync } = require("fs")
const { resolve } = require("path")

// external tooling
const test = require("ava")
const postcss = require("postcss")

// plugin
const atImport = require("..")

test("should add dependency message for each import", t => {
  return postcss()
    .use(atImport({ path: "test/fixtures/imports" }))
    .process(readFileSync("test/fixtures/media-import.css"), {
      from: "test/fixtures/media-import.css",
    })
    .then(result => {
      const deps = result.messages.filter(
        message => message.type === "dependency",
      )
      const expected = [
        {
          type: "dependency",
          plugin: "postcss-import",
          file: resolve("test/fixtures/imports/media-import-level-2.css"),
          parent: resolve("test/fixtures/media-import.css"),
        },
        {
          type: "dependency",
          plugin: "postcss-import",
          file: resolve("test/fixtures/imports/media-import-level-3.css"),
          parent: resolve("test/fixtures/imports/media-import-level-2.css"),
        },
      ]
      t.deepEqual(deps, expected)
    })
})
