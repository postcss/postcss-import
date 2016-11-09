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
        t.deepEqual(
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
      t.deepEqual(
        files,
        [
          resolve("fixtures/media-import.css"),
          resolve("fixtures/imports/media-import-level-2.css"),
          resolve("fixtures/imports/media-import-level-3.css"),
        ]
      )
    })
})

test("should add dependency message for each import", t => {
  return postcss()
    .use(atImport({
      path: "fixtures/imports",
    }))
    .process(readFileSync("fixtures/media-import.css"), {
      from: "fixtures/media-import.css",
    })
    .then((result) => {
      var deps = result.messages.filter(
        message => message.type === "dependency"
      )
      var expected = [
        {
          type: "dependency",
          file: resolve("fixtures/imports/media-import-level-2.css"),
          parent: resolve("fixtures/media-import.css"),
        },
        {
          type: "dependency",
          file: resolve("fixtures/imports/media-import-level-3.css"),
          parent: resolve("fixtures/imports/media-import-level-2.css"),
        },
      ]
      t.deepEqual(deps, expected)
    })
})
