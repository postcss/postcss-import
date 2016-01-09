import test from "ava"
import path from "path"
import { readFileSync } from "fs"
import postcss from "postcss"
import atImport from ".."
import compareFixtures from "./lib/compare-fixtures"

test("should import stylsheets", t => {
  return compareFixtures(t, "simple")
})

test("should not import a stylsheet twice", t => {
  return compareFixtures(t, "no-duplicate")
})

test("should be able to import a stylsheet twice", t => {
  return compareFixtures(t, "duplicates", {
    skipDuplicates: false,
  })
})

test("should import stylsheets with same content", t => {
  return compareFixtures(t, "same")
})

test("should ignore & adjust external import", t => {
  return compareFixtures(t, "ignore")
})

test("should import stylsheets relatively", t => {
  return compareFixtures(t, "relative")
})

test("should support transform", t => {
  return compareFixtures(t, "transform", {
    transform: require("css-whitespace"),
  })
})

test("should work without a specified path", t => {
  return compareFixtures(t, "cwd")
})

test("should not need `path` option if `source` option has been passed", t => {
  return compareFixtures(t, "relative-to-source", null, {
    from: "fixtures/relative-to-source.css",
  })
})

test("should be able to consume npm package or local modules", t => {
  return compareFixtures(t, "modules", {
    root: ".",
  })
})

test("should not fail with only one absolute import", t => {
  var base = "@import url(http://)"
  return postcss()
    .use(atImport())
    .process(base)
    .then(result => {
      t.is(result.warnings().length, 0)
      t.is(result.css, base)
    })
})

test("should not fail with absolute and local import", t => {
  return postcss()
    .use(atImport())
    .process("@import url('http://');\n@import 'fixtures/imports/foo.css';")
    .then(result => {
      t.is(result.css, "@import url('http://');\nfoo{}")
    })
})

test("should output readable trace", t => {
  var file = "fixtures/imports/import-missing.css"
  return postcss()
    .use(atImport())
    .process(readFileSync(file), { from: file })
    .then(result => {
      t.is(
        result.warnings()[0].text,
        /* eslint-disable max-len */
        "Failed to find 'missing-file.css'\n    in [ \n        " + path.resolve("fixtures/imports") + "\n    ]"
        /* eslint-enabme max-len */
      )
    })
})

test("should contain a correct sourcemap", t => {
  return postcss()
    .use(atImport())
    .process(readFileSync("sourcemap/in.css"), {
      from: "sourcemap/in.css",
      to: null,
      map: {
        inline: false,
      },
    })
    .then(result => {
      t.is(
        result.map.toString(),
        readFileSync("sourcemap/out.css.map", "utf8").trim()
      )
    })
})

test("import relative files using path option only", t => {
  return postcss()
    .use(atImport({ path: "fixtures/imports/relative" }))
    .process(readFileSync("fixtures/imports/relative/import.css"))
    .then(result => {
      t.is(result.css, readFileSync("fixtures/imports/bar.css", "utf-8"))
    })
})

test("inlined @import should keep PostCSS AST references clean", t => {
  return postcss()
    .use(atImport())
    .process("@import 'fixtures/imports/foo.css';\nbar{}")
    .then(result => {
      result.root.nodes.forEach(node => {
        t.is(result.root, node.parent)
      })
    })
})

test("should work with empty files", t => {
  return compareFixtures(t, "empty-and-useless", {
    path: "fixtures/imports",
  }, null, [
    path.resolve("fixtures/imports/empty.css") + " is empty",
  ])
})

test("should work with no styles without throwing an error", t => {
  return postcss()
    .use(atImport())
    .process("")
    .then(result => {
      t.is(result.warnings().length, 0)
    })
})
