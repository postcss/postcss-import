"use strict"
// external tooling
const test = require("ava")
const postcss = require("postcss")

const crypto = require("crypto")
const cwd = process.cwd()

// plugin
const atImport = require("..")

// internal tooling
const checkFixture = require("./helpers/check-fixture")

test("should resolve layers of import statements", checkFixture, "layer")

test(
  "should correctly wrap imported at rules in layers",
  checkFixture,
  "layer-import-atrules",
  {
    nameLayer: hashLayerName,
  }
)

test(
  "should correctly wrap imported at rules in anonymous layers",
  checkFixture,
  "layer-import-atrules-anonymous",
  {
    nameLayer: hashLayerName,
  }
)

test("should group rules", checkFixture, "layer-rule-grouping", {
  nameLayer: hashLayerName,
})

test("should pass the root file name to the nameLayer function", t => {
  return postcss()
    .use(atImport({ path: "test/fixtures/imports", nameLayer: hashLayerName }))
    .process('@import "foo.css" layer;', { from: "layer.css" })
    .then(result => {
      t.is(result.css, `@layer import-anon-layer-52ff1597784c{\nfoo{}\n}`)
    })
})

test("should error when value is not a function", t => {
  return postcss()
    .use(atImport({ nameLayer: "not a function" }))
    .process("", { from: undefined })
    .catch(error =>
      t.regex(error.message, /nameLayer option must be a function/s)
    )
})

test("should throw when using anonymous layers without the nameLayer plugin option", t => {
  return postcss()
    .use(atImport({ path: "test/fixtures/imports" }))
    .process('@import "foo.css" layer;', { from: undefined })
    .catch(err => {
      t.is(
        err.message,
        'postcss-import: <css input>:1:1: When using anonymous layers in @import you must also set the "nameLayer" plugin option'
      )
    })
})

function hashLayerName(index, rootFilename) {
  if (!rootFilename) {
    return `import-anon-layer-${index}`
  }

  // A stable, deterministic and unique layer name:
  // - layer index
  // - relative rootFilename to current working directory
  return `import-anon-layer-${crypto
    .createHash("sha256")
    .update(`${index}-${rootFilename.split(cwd)[1]}`)
    .digest("hex")
    .slice(0, 12)}`
}
