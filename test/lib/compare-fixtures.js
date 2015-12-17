var fs = require("fs")
var postcss = require("postcss")
var assign = require("object-assign")
var atImport = require("../..")

function read(name) {
  return fs.readFileSync("fixtures/" + name + ".css", "utf8")
}

module.exports = function(t, name, opts, postcssOpts) {
  opts = assign({ path: "fixtures/imports" }, opts)
  return postcss(atImport(opts))
    .process(read(name), postcssOpts)
    .then(function(result) {
      var actual = result.css
      var expected = read(name + ".expected")
      // handy thing: checkout actual in the *.actual.css file
      fs.writeFile("fixtures/" + name + ".actual.css", actual)
      t.is(actual, expected)
      t.is(result.warnings().length, 0)
    })
}
