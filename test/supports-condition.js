"use strict"
// external tooling
const test = require("ava")

// internal tooling
const checkFixture = require("./helpers/check-fixture")

test(
  "should resolve supports conditions of import statements",
  checkFixture,
  "supports-condition-import",
)
