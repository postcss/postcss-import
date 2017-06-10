// external tooling
import test from "ava"

// internal tooling
import checkFixture from "./helpers/check-fixture"

test(
  "should resolve media queries of import statements",
  checkFixture,
  "media-import"
)

test("should resolve media queries", checkFixture, "media-query")

test(
  "should resolve content inside import with media queries",
  checkFixture,
  "media-content"
)

test("should join correctly media queries", checkFixture, "media-join")
