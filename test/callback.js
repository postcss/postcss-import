import test from "ava"
import postcss from "postcss"
import atImport from ".."
import { resolve } from "path"
import { readFileSync } from "fs"

test("should have a callback that returns an object" +
  " containing imported files", t => {
  return postcss()
    .use(atImport({
      path: "fixtures/imports",
      onImport: files => {
        t.same(
          files,
          [
            resolve("fixtures/media-import.css"),
            resolve("fixtures/imports/media-import-level-2.css"),
            resolve("fixtures/imports/media-import-level-3.css"),
          ]
        )
      },
    }))
    .process(readFileSync("fixtures/media-import.css"), {
      from: "fixtures/media-import.css",
    })
})

test("should have a callback shortcut for webpack", t => {
  var files = []
  var webpackMock = {
    addDependency: file => {
      files.push(file)
    },
  }

  return postcss()
    .use(atImport({
      path: "fixtures/imports",
      addDependencyTo: webpackMock,
    }))
    .process(readFileSync("fixtures/media-import.css"), {
      from: "fixtures/media-import.css",
    })
    .then(() => {
      t.same(
        files,
        [
          resolve("fixtures/media-import.css"),
          resolve("fixtures/imports/media-import-level-2.css"),
          resolve("fixtures/imports/media-import-level-3.css"),
        ]
      )
    })
})
