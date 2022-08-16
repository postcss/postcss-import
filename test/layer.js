"use strict"
// external tooling
const test = require("ava")
const crypto = require("crypto")
const cwd = process.cwd()

// internal tooling
const checkFixture = require("./helpers/check-fixture")

test("should resolve layers of import statements", checkFixture, "layer", {
  nameLayer: hashLayerName,
})

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

function hashLayerName(index, filename, importRule) {
  return `import-anon-layer-${crypto
    .createHash("sha256")
    .update(`${index}-${filename.split(cwd)[1]}-${importRule}`)
    .digest("hex")
    .slice(0, 12)}`
}
