// builtin tooling
import { readFileSync } from "fs"
import path from "path"

// external tooling
import test from "ava"
import postcss from "postcss"

// internal tooling
import compareFixtures from "./helpers/compare-fixtures"

// plugin
import atImport from ".."

test("should import stylsheets", t => {
  return compareFixtures(t, "simple")
})

test("should not import a stylsheet twice", t => {
  return compareFixtures(t, "no-duplicate")
})

test("should be able to import a stylsheet twice", t => {
  return compareFixtures(t, "duplicates", { skipDuplicates: false })
})

test("should import stylsheets with same content", t => {
  return compareFixtures(t, "same")
})

test("should ignore & adjust external import", t => {
  return compareFixtures(t, "ignore")
})

test("should not fail with only one absolute import", t => {
  var base = "@import url(http://)"
  return postcss().use(atImport()).process(base).then(result => {
    t.is(result.warnings().length, 0)
    t.is(result.css, base)
  })
})

test("should not fail with absolute and local import", t => {
  return postcss()
    .use(atImport())
    .process(
      "@import url('http://');\n@import 'test/fixtures/imports/foo.css';"
    )
    .then(result => t.is(result.css, "@import url('http://');\nfoo{}"))
})

test("should error when file not found", t => {
  t.plan(1)
  var file = "test/fixtures/imports/import-missing.css"
  return postcss()
    .use(atImport())
    .process(readFileSync(file), { from: file })
    .catch(err => t.truthy(err))
})

test("should contain a correct sourcemap", t => {
  return postcss()
    .use(atImport())
    .process(readFileSync("test/sourcemap/in.css"), {
      from: "test/sourcemap/in.css",
      to: null,
      map: { inline: false },
    })
    .then(result => {
      t.is(
        result.map.toString(),
        readFileSync("test/sourcemap/out.css.map", "utf8").trim()
      )
    })
})

test("inlined @import should keep PostCSS AST references clean", t => {
  return postcss()
    .use(atImport())
    .process("@import 'test/fixtures/imports/foo.css';\nbar{}")
    .then(result => {
      result.root.nodes.forEach(node => t.is(result.root, node.parent))
    })
})

test("should work with empty files", t => {
  return compareFixtures(
    t,
    "empty-and-useless",
    { path: "test/fixtures/imports" },
    null,
    [path.resolve("test/fixtures/imports/empty.css") + " is empty"]
  )
})

test("should work with no styles without throwing an error", t => {
  return postcss().use(atImport()).process("").then(result => {
    t.is(result.warnings().length, 0)
  })
})
