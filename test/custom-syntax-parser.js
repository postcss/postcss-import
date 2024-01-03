"use strict"
// external tooling
const test = require("ava")
const scss = require("postcss-scss")
const sugarss = require("sugarss")

// internal tooling
const checkFixture = require("./helpers/check-fixture")

test("should process custom syntax", checkFixture, "scss-syntax", null, {
  syntax: scss,
})

test(
  "should process custom syntax by parser",
  checkFixture,
  "scss-parser",
  null,
  { parser: scss },
)

test(".css importing .sss should work", checkFixture, "import-sss")

test(
  ".sss importing .sss should work",
  checkFixture,
  { name: "sugar", ext: ".sss" },
  null,
  { parser: sugarss },
)

test(
  ".sss importing .css should work",
  checkFixture,
  { name: "sugar-import-css", ext: ".sss" },
  null,
  { parser: sugarss },
)

test(
  ".css importing .sss importing .css should work",
  checkFixture,
  "import-sss-css",
)

test(
  ".sss importing .css importing .sss should work",
  checkFixture,
  { name: "import-css-sss", ext: ".sss" },
  null,
  { parser: sugarss },
)
