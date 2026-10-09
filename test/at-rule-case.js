"use strict"

const path = require("path")
const { default: test } = require("ava")
const postcss = require("postcss")
const atImport = require("..")

for (const input of [
  '@IMPORT "a.css";',
  '@ImPoRt "a.css"; @import "b.css";',
  '@LAYER base; @IMPORT "a.css";',
]) {
  test(`should recognize case-insensitive at-rule names: ${input}`, async t => {
    const result = await postcss([
      atImport({
        resolve: id => path.resolve(id),
        load: () => "a { color: red; }",
      }),
    ]).process(input, { from: undefined })

    t.is(result.warnings().length, 0)
    t.false(/@import/i.test(result.css))
    t.true(result.css.includes("color: red"))
    if (input.startsWith("@LAYER"))
      t.true(result.css.startsWith("@LAYER base;"))
  })
}
