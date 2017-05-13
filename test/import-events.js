// builtin tooling
import { readFileSync } from "fs"
import { resolve } from "path"

// external tooling
import test from "ava"
import postcss from "postcss"

// plugin
import atImport from ".."

test("should add dependency message for each import", t => {
  return postcss()
    .use(atImport({ path: "test/fixtures/imports" }))
    .process(readFileSync("test/fixtures/media-import.css"), {
      from: "test/fixtures/media-import.css",
    })
    .then(result => {
      const deps = result.messages.filter(
        message => message.type === "dependency"
      )
      const expected = [
        {
          type: "dependency",
          file: resolve("test/fixtures/imports/media-import-level-2.css"),
          parent: resolve("test/fixtures/media-import.css"),
        },
        {
          type: "dependency",
          file: resolve("test/fixtures/imports/media-import-level-3.css"),
          parent: resolve("test/fixtures/imports/media-import-level-2.css"),
        },
      ]
      t.deepEqual(deps, expected)
    })
})
