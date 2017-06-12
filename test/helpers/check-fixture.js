"use strict"

// builtin tooling
const fs = require("fs")

// external tooling
const postcss = require("postcss")

// plugin
const atImport = require("../..")

function read(name, ext) {
  ext = ext || ".css"
  return fs.readFileSync(`test/fixtures/${name}${ext}`, "utf8")
}

module.exports = function(t, file, opts, postcssOpts = {}, warnings = []) {
  opts = Object.assign({ path: "test/fixtures/imports" }, opts)
  if (typeof file === "string") file = { name: file, ext: ".css" }
  const { name, ext } = file

  function onResult(result) {
    const actual = result.css
    const expected = read(`${name}.expected`)
    // handy thing: checkout actual in the *.actual.css file
    fs.writeFile(`test/fixtures/${name}.actual.css`, actual, err => {
      if (err) console.warn(`Warning: ${err}; not fatal, continuing`)
    })
    t.is(actual, expected)
    if (!warnings) warnings = []
    result.warnings().forEach((warning, index) => {
      t.is(
        warning.text,
        warnings[index],
        `unexpected warning: "${warning.text}"`
      )
    })
  }

  const lazyResult = postcss(atImport(opts)).process(
    read(name, ext),
    postcssOpts || {}
  )

  if (postcssOpts && postcssOpts.sync) {
    onResult(lazyResult)
  } else {
    return lazyResult.then(onResult)
  }
}
