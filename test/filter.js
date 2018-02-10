// external tooling
import test from "ava"

// internal tooling
import checkFixture from "./helpers/check-fixture"

test("should filter all imported stylesheets", checkFixture, "filter-all", {
  filter: () => false,
})

test("should filter some stylesheets", checkFixture, "filter-some", {
  filter: url => url !== "foobar.css",
})

test("shouldn't accept ignored stylesheets", checkFixture, "filter-ignore", {
  filter: () => true,
})
