"use strict"
// external tooling
const test = require("ava")

// internal tooling
const checkFixture = require("./helpers/check-fixture")

test("should resolve layers of import statements", checkFixture, "layer")

test(
  "should correctly wrap imported at rules in layers",
  checkFixture,
  "layer-import-atrules"
)

test(
  "should correctly wrap imported at rules in anonymous layers",
  checkFixture,
  "layer-import-atrules-anonymous"
)

test("should group rules", checkFixture, "layer-rule-grouping")
