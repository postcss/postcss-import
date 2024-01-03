"use strict"
// builtin tooling
const { readFileSync } = require("fs")
const path = require("path")

// external tooling
const test = require("ava")
const postcss = require("postcss")

// plugin
const atImport = require("..")

// internal tooling
const checkFixture = require("./helpers/check-fixture")

test("should import stylesheets", checkFixture, "simple")

test("should not import a stylesheet twice", checkFixture, "no-duplicate")

test(
  "should be able to import a stylesheet twice",
  checkFixture,
  "duplicates",
  {
    skipDuplicates: false,
  },
)

test(
  "should be able to import a stylesheet with cyclical dependencies",
  checkFixture,
  "cyclical",
  {
    skipDuplicates: false,
  },
)

test(
  "should be able to import a stylesheet with cyclical dependencies and skip duplicates is true",
  checkFixture,
  "cyclical-skip-duplicates",
  {
    skipDuplicates: true,
  },
)

test("should import stylesheets with same content", checkFixture, "same")

test("should ignore & adjust external import", checkFixture, "ignore")

test("should not fail with only one absolute import", t => {
  const base = "@import url(http://)"
  return postcss()
    .use(atImport())
    .process(base, { from: undefined })
    .then(result => {
      t.is(result.warnings().length, 0)
      t.is(result.css, base)
    })
})

test("should not fail with absolute and local import", t => {
  return postcss()
    .use(atImport())
    .process(
      "@import url('http://');\n@import 'test/fixtures/imports/foo.css';",
      { from: undefined },
    )
    .then(result => t.is(result.css, "@import url('http://');\nfoo{}"))
})

test("should keep @charset first", t => {
  const base = '@charset "UTF-8";\n@import url(http://);'
  return postcss()
    .use(atImport())
    .process(base, { from: undefined })
    .then(result => {
      t.is(result.warnings().length, 0)
      t.is(result.css, base)
    })
})

test(
  "should handle multiple @charset statements",
  checkFixture,
  "charset-import",
)

test("should error if incompatible @charset statements", t => {
  t.plan(2)
  const file = "test/fixtures/charset-error.css"
  return postcss()
    .use(atImport())
    .process(readFileSync(file), { from: file })
    .catch(err => {
      t.truthy(err)
      t.regex(
        err.message,
        /Incompatible @charset statements:.+specified in.+specified in.+/s,
      )
    })
})

test("should error when file not found", t => {
  t.plan(1)
  const file = "test/fixtures/imports/import-missing.css"
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
        readFileSync(
          process.platform === "win32"
            ? "test/sourcemap/out.css.win.map"
            : "test/sourcemap/out.css.map",
          "utf8",
        ).trim(),
      )
    })
})

test("inlined @import should keep PostCSS AST references clean", t => {
  return postcss()
    .use(atImport())
    .process("@import 'test/fixtures/imports/foo.css';\nbar{}", {
      from: undefined,
    })
    .then(result => {
      result.root.nodes.forEach(node => {
        t.is(result.root, node.parent)
      })
    })
})

test(
  "should work with empty files",
  checkFixture,
  "empty-and-useless",
  { path: "test/fixtures/imports" },
  null,
  [`${path.resolve("test/fixtures/imports/empty.css")} is empty`],
)

test(
  "should be able to disable warnings for empty files",
  checkFixture,
  "empty-and-useless",
  { path: "test/fixtures/imports", warnOnEmpty: false },
)

test("should work with no styles without throwing an error", t => {
  return postcss()
    .use(atImport())
    .process("", { from: undefined })
    .then(result => {
      t.is(result.warnings().length, 0)
    })
})
