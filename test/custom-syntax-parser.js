import test from "ava"
import scss from "postcss-scss"
import compareFixtures from "./helpers/compare-fixtures"

test("should process custom syntax", t => {
  return compareFixtures(t, "scss-syntax", null, {
    syntax: scss,
  })
})

test("should process custom syntax by parser", t => {
  return compareFixtures(t, "scss-parser", null, {
    parser: scss,
  })
})
