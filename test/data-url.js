"use strict"
// external tooling
const test = require("ava")

// internal tooling
const checkFixture = require("./helpers/check-fixture")

test("should inline data urls", checkFixture, "data-url")
