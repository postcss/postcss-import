"use strict"
// external tooling
const test = require("ava")

// internal tooling
const checkFixture = require("./helpers/check-fixture")

test("should resolve layers of import statements", checkFixture, "layer")

test(
  "should correctly wrap imported at rules in layers",
  checkFixture,
  "layer-import-atrules",
)

test(
  "should correctly wrap imported at rules in anonymous layers",
  checkFixture,
  "layer-import-atrules-anonymous",
)

test(
  "should correctly handle duplicate anonymous imports",
  checkFixture,
  "layer-duplicate-anonymous-imports",
  {
    skipDuplicates: false,
  },
)

test(
  "should correctly handle duplicate anonymous imports and skip duplicates is true",
  checkFixture,
  "layer-duplicate-anonymous-imports-skip",
)
