import test from "ava"
import postcss from "postcss"
import atImport from ".."

test("should warn when a user didn't close an import with ;", t => {
  return postcss()
    .use(atImport())
    .process("@import url('http://') :root{}")
    .then(function(result) {
      t.is(
        result.warnings()[0].text,
        "It looks like you didn't end correctly your @import statement. " +
        "Some children nodes are attached to it."
        )
    })
})

test("should warn on invalid url", t => {
  return postcss()
    .use(atImport())
    .process(`
      @import foo-bar;
      @import ;
      @import '';
      @import "";
      @import url();
      @import url('');
      @import url("");
    `)
    .then(function(result) {
      const warnings = result.warnings()
      t.is(warnings[0].text, `Unable to find uri in '@import foo-bar'`)
      t.is(warnings[1].text, `Unable to find uri in '@import '`)
      t.is(warnings[2].text, `Unable to find uri in '@import '''`)
      t.is(warnings[3].text, `Unable to find uri in '@import ""'`)
      t.is(warnings[4].text, `Unable to find uri in '@import url()'`)
      t.is(warnings[5].text, `Unable to find uri in '@import url('')'`)
      t.is(warnings[6].text, `Unable to find uri in '@import url("")'`)
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
