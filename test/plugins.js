"use strict"
// external tooling
const test = require("ava")
const postcss = require("postcss")

// plugin
const atImport = require("..")

// internal tooling
const checkFixture = require("./helpers/check-fixture")

test("should apply plugins to root", t => {
  const atRules = []
  const rules = []
  return checkFixture(t, "plugins", {
    plugins: [
      css => {
        css.walk(node => {
          if (node.type === "rule") {
            rules.push(node.selector)
            if (node.selector === "bar") node.remove()
            else node.selector += "-converted"
          }
          if (node.type === "atrule") atRules.push(node.name)
        })
      },
    ],
  }).then(() => {
    t.deepEqual(atRules, ["import"])
    t.deepEqual(rules, ["foo", "bar"])
  })
})

test("should error when value is not an array", t => {
  return postcss()
    .use(atImport({ plugins: "foo" }))
    .process("", { from: undefined })
    .catch(error => t.regex(error.message, /plugins option must be an array/))
})

test("should remain silent when value is an empty array", t => {
  return postcss()
    .use(atImport({ plugins: [] }))
    .process("", { from: undefined })
    .then(result => t.is(result.css, ""))
})
