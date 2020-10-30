"use strict"
// external tooling
const test = require("ava")

// internal tooling
const checkFixture = require("./helpers/check-fixture")

test.serial("should accept content", checkFixture, "custom-load", {
  load: () => "custom-content {}",
})

test.serial("should accept promised content", checkFixture, "custom-load", {
  load: () => Promise.resolve("custom-content {}"),
})
