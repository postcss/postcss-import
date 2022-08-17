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

test("should error when value is not a function", t => {
  return postcss()
    .use(atImport({ nameLayer: "not a function" }))
    .process("", { from: undefined })
    .catch(error => t.is(error.message, "nameLayer option must be a function"))
})

test("should warn when using anonymous layers without the nameLayer plugin option", t => {
  return postcss()
    .use(atImport({ path: "test/fixtures/imports" }))
    .process('@import "foo.css" layer;', { from: undefined })
    .then(result => {
      const warnings = result.warnings()
      t.is(warnings.length, 1)
      t.is(
        warnings[0].text,
        'When using anonymous layers in @import you must also set the "nameLayer" plugin option'
      )
    })
})

function hashLayerName(index, filename) {
  // A stable, deterministic and unique layer name:
  // - layer index
  // - relative filename to current working directory
  return `import-anon-layer-${crypto
    .createHash("sha256")
    .update(`${index}-${filename.split(cwd)[1]}`)
    .digest("hex")
    .slice(0, 12)}`
}
