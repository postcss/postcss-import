var fs = require("fs")
var postcss = require("postcss")
var assign = require("object-assign")
var atImport = require("../..")

function read(name, ext) {
  if (!ext) ext = ".css"
  return fs.readFileSync("fixtures/" + name + ext, "utf8")
}

module.exports = function(t, name, ext, opts, postcssOpts, warnings) {
  opts = assign({ path: "fixtures/imports" }, opts)
  return postcss(atImport(opts))
    .process(read(name, ext), postcssOpts || {})
    .then(function(result) {
      var actual = result.css
      var expected = read(name + ".expected")
      // handy thing: checkout actual in the *.actual.css file
      fs.writeFile("fixtures/" + name + ".actual.css", actual)
      t.is(actual, expected)
      if (!warnings) {
        warnings = []
      }
      result.warnings().forEach(function(warning, index) {
        t.is(
          warning.text,
          warnings[index],
          "unexpected warning: \"" + warning.text + "\""
        )
      })
    })
}
