import test from "ava"
import postcss from "postcss"
import atImport from ".."

test("should warn when a user didn't close an import with ;", t => {
  return postcss()
    .use(atImport())
    .process("@import url('http://') :root{}")
    .then(function(result) {
      t.is(result.warnings()[0].text, atImport.warnNodesMessage)
    })
})

test("should not warn when a user closed an import with ;", t => {
  return postcss()
    .use(atImport())
    .process("@import url('http://');")
    .then(function(result) {
      t.is(result.warnings().length, 0)
    })
})
