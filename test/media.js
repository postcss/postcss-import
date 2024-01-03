"use strict"
// external tooling
const test = require("ava")

// internal tooling
const checkFixture = require("./helpers/check-fixture")

test(
  "should resolve media queries of import statements",
  checkFixture,
  "media-import",
)

test("should resolve media queries", checkFixture, "media-query")

test(
  "should resolve content inside import with media queries",
  checkFixture,
  "media-content",
)

test(
  "should resolve media query imports with charset",
  checkFixture,
  "media-charset",
)

test("should correctly combine media queries", checkFixture, "media-combine")
