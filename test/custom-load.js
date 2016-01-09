import test from "ava"
import compareFixtures from "./lib/compare-fixtures"

test("should accept content", t => {
  return compareFixtures(t, "custom-load", {
    load: () => {
      return "custom-content {}"
    },
  })
})

test("should accept promised content", t => {
  return compareFixtures(t, "custom-load", {
    load: () => {
      return Promise.resolve("custom-content {}")
    },
  })
})
