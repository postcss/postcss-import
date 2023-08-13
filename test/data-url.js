"use strict"
// external tooling
const test = require("ava")

// internal tooling
const checkFixture = require("./helpers/check-fixture")

test("should inline data urls", checkFixture, "data-url", null, null, [
  `Unable to import 'foo.css' from a stylesheet that is embedded in a data url`,
])
