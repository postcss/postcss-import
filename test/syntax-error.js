// builtin tooling
import fs from "fs"

// external tooling
import test from "ava"
import postcss from "postcss"

// plugin
import atImport from ".."

test("SyntaxError in imported file throws", t => {
  return postcss(atImport({ path: "test/fixtures/imports" }))
    .process(fs.readFileSync("test/fixtures/syntax-error.css", "utf8"), {
      from: undefined,
    })
    .then(() => t.fail("should error out"))
    .catch(err => t.truthy(err))
})
