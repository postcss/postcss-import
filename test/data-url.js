"use strict"
// external tooling
const test = require("ava")
const postcss = require("postcss")

// plugin
const atImport = require("..")

// internal tooling
const checkFixture = require("./helpers/check-fixture")

test("should inline data urls", checkFixture, "data-url")

test("should error on relative urls from stylesheets in data urls", t => {
  return postcss()
    .use(atImport())
    .process(
      "@import url(data:text/css;base64,QGltcG9ydCB1cmwoZm9vLmNzcyk7CgpwIHsKICBjb2xvcjogYmx1ZTsKfQo=);",
      { from: undefined },
    )
    .catch(error =>
      t.regex(
        error.message,
        /Unable to import '(?:.*?)' from a stylesheet that is embedded in a data url/,
      ),
    )
})
