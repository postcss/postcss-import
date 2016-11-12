import test from "ava"
import scss from "postcss-scss"
import sugarss from "sugarss"
import compareFixtures from "./helpers/compare-fixtures"
import compareFixturesExt from "./helpers/compare-fixtures-ext"

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

test(".css importing .sss should work", t => {
  return compareFixtures(t, "import-sss")
})

test(".sss importing .sss should work", t => {
  return compareFixturesExt(t, "sugar", ".sss", null, {
    parser: sugarss,
  })
})

test(".sss importing .css should work", t => {
  return compareFixturesExt(t, "sugar-import-css", ".sss", null, {
    parser: sugarss,
  })
})

test(".css importing .sss importing .css should work", t => {
  return compareFixtures(t, "import-sss-css")
})

test(".sss importing .css importing .sss should work", t => {
  return compareFixturesExt(t, "import-css-sss", ".sss", null, {
    parser: sugarss,
  })
})
