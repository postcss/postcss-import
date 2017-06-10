// external tooling
import test from "ava"
import scss from "postcss-scss"
import sugarss from "sugarss"

// internal tooling
import checkFixture from "./helpers/check-fixture"

test("should process custom syntax", checkFixture, "scss-syntax", null, {
  syntax: scss,
})

test(
  "should process custom syntax by parser",
  checkFixture,
  "scss-parser",
  null,
  { parser: scss }
)

test(".css importing .sss should work", checkFixture, "import-sss")

test(
  ".sss importing .sss should work",
  checkFixture,
  { name: "sugar", ext: ".sss" },
  null,
  { parser: sugarss }
)

test(
  ".sss importing .css should work",
  checkFixture,
  { name: "sugar-import-css", ext: ".sss" },
  null,
  { parser: sugarss }
)

test(
  ".css importing .sss importing .css should work",
  checkFixture,
  "import-sss-css"
)

test(
  ".sss importing .css importing .sss should work",
  checkFixture,
  { name: "import-css-sss", ext: ".sss" },
  null,
  { parser: sugarss }
)
