// external tooling
import test from "ava"

// internal tooling
import checkFixture from "./helpers/check-fixture"

test.serial("should accept content", checkFixture, "custom-load", {
  load: () => "custom-content {}",
})

test.serial("should accept promised content", checkFixture, "custom-load", {
  load: () => Promise.resolve("custom-content {}"),
})
