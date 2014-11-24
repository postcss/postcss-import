"use strict";

var test = require("tape")
var assert = require("assert")

var path = require("path")
var fs = require("fs")

var atImport = require("..")
var postcss = require("postcss")

var fixturesDir = path.join(__dirname, "fixtures")
var importsDir = path.join(fixturesDir, "imports")

function read(name) {
  return fs.readFileSync("test/" + name + ".css", "utf8").trim()
}

function compareFixtures(t, name, msg, opts, postcssOpts) {
  opts = opts || {path: importsDir}
  var actual = postcss().use(atImport(opts)).process(read("fixtures/" + name), postcssOpts).css.trim()
  var expected = read("fixtures/" + name + ".expected")

  // handy thing: checkout actual in the *.actual.css file
  fs.writeFile("test/fixtures/" + name + ".actual.css", actual)

  t.equal(actual, expected, msg)
}

test("@import", function(t) {
  compareFixtures(t, "simple", "should import stylsheets")

  compareFixtures(t, "no-duplicate", "should not import a stylsheet twice")

  compareFixtures(t, "ignore", "should ignore & adjust external import")

  compareFixtures(t, "recursive", "should import stylsheets recursively")

  compareFixtures(t, "relative", "should import stylsheets relatively")

  compareFixtures(t, "empty-and-useless", "should work with empty files")

  compareFixtures(t, "transform", "should support transform", {
    path: importsDir,
    transform: require("css-whitespace")
  })

  compareFixtures(t, "cwd", "should work without a specified path", {})

  compareFixtures(t, "relative-to-source", "should not need `path` option if `source` option has been passed to postcss", null, {from: "test/fixtures/relative-to-source.css"})

  compareFixtures(t, "npm", "should be able to consume npm package")

  t.end()
})

test("@import error output", function(t) {
  var file = importsDir + "/import-missing.css"
  t.doesNotThrow(
    function() {
      assert.throws(
        function() {postcss().use(atImport()).process(fs.readFileSync(file), {from: file})},
        /import-missing.css:2:5 Failed to find 'missing-file.css'\n\s+in \[/gm
      )
    },
    "should output readable trace"
  )

  t.end()
})

/**
 * Sourcemap test
 */
test("sourcemap for @import", function(t) {
  var input = read("sourcemap/in")
  var output = read("sourcemap/out")
  var options = {
    from: "./test/sourcemap/in.css",
    to: null,
    map: {
      inline: true,
      sourcesContent: true
    }
  }
  var css = postcss()
    .use(atImport(options))
    .process(input, options)
    .css.trim()
  t.equal(css, output, "should contain a correct sourcemap")

  t.end()
})
