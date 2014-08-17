var test = require("tape")
var assert = require("assert");

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
  var actual = postcss().use(atImport(opts)).process(read("fixtures/" + name), postcssOpts).css
  var expected = read("fixtures/" + name + ".expected")

  // handy thing: checkout actual in the *.actual.css file
  fs.writeFile("test/fixtures/" + name + ".actual.css", actual)

  t.equal(actual, expected, msg)
}

test("@import", function(t) {
  compareFixtures(t, "simple", "should import stylsheets")

  compareFixtures(t, "recursive", "should import stylsheets recursively")

  compareFixtures(t, "relative", "should import stylsheets relatively")

  compareFixtures(t, "transform", "should support transform", {
    path: importsDir,
    transform: require("css-whitespace")
  })

  compareFixtures(t, "cwd", "should work without a specified path", {})

  compareFixtures(t, "relative-to-source", "should not need `path` option if `source` option has been passed to postcss", null, {from: "test/fixtures/relative-to-source.css"})

  compareFixtures(t, "rewrite-urls", "should update relaitive asset urls in imported stylesheet", null, {from: "test/fixtures/rewrite-urls.css"})

  t.end()
})

test("@import error output", function(t) {
  t.doesNotThrow(
    function() {
      var file = importsDir + "/import-missing.css"
      var expectedError = file + "2:5: " +
      "Failed to find missing-file.css" +
      "\n    in [ " +
      "\n        " + importsDir + "," +
      "\n        ../node_modules" +
      "\n    ]"
      assert.throws(
        function() {postcss().use(atImport({path: [importsDir, "../node_modules"]})).process(fs.readFileSync(file), {from: file})},
        function(err) {
          if (err instanceof Error && err.message == expectedError) {
            return true
          }
        }
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
