import test from "ava"
import compareFixtures from "./helpers/compare-fixtures"

test.serial("should accept content", t => {
  return compareFixtures(t, "transform-content", {
    transform: () => "transformed-content {}",
  })
})

test.serial("should accept promised content", t => {
  return compareFixtures(t, "transform-content", {
    transform: () => Promise.resolve("transformed-content {}"),
  })
})

test.serial("should ignore returned undefined", t => {
  return compareFixtures(t, "transform-undefined", {
    transform: () => undefined,
  })
})

test.serial("should ignore promised undefined", t => {
  return compareFixtures(t, "transform-undefined", {
    transform: () => Promise.resolve(undefined),
  })
})
