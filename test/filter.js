"use strict"
// external tooling
const test = require("ava")

// internal tooling
const checkFixture = require("./helpers/check-fixture")

test("should filter all imported stylesheets", checkFixture, "filter-all", {
  filter: () => false,
})

test("should filter some stylesheets", checkFixture, "filter-some", {
  filter: url => url !== "foobar.css",
})

test("shouldn't accept ignored stylesheets", checkFixture, "filter-ignore", {
  filter: () => true,
})
