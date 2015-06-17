var test = require("tape")

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
  var actual = postcss()
    .use(atImport(opts))
    .process(read("fixtures/" + name), postcssOpts)
    .css.trim()
  var expected = read("fixtures/" + name + ".expected")

  // handy thing: checkout actual in the *.actual.css file
  fs.writeFile("test/fixtures/" + name + ".actual.css", actual)

  t.equal(actual, expected, msg)
}

test("@import", function(t) {
  compareFixtures(t, "simple", "should import stylsheets")

  compareFixtures(t, "no-duplicate", "should not import a stylsheet twice")

  compareFixtures(t, "ignore", "should ignore & adjust external import")

  compareFixtures(t, "glob", "should handle a glob pattern", {
    root: __dirname,
    path: importsDir,
    glob: true,
  })

  compareFixtures(
    t,
    "glob-alt",
     "should handle a glob pattern with single quote and/or url(...)", {
    path: importsDir,
    glob: true,
  })
  compareFixtures(t, "recursive", "should import stylsheets recursively")

  compareFixtures(t, "relative", "should import stylsheets relatively")

  compareFixtures(t, "empty-and-useless", "should work with empty files")

  compareFixtures(t, "transform", "should support transform", {
    path: importsDir,
    transform: require("css-whitespace"),
  })

  compareFixtures(t, "cwd", "should work without a specified path", {})

  compareFixtures(
    t,
    "relative-to-source",
    "should not need `path` option if `source` option has been passed",
    null,
    {from: "test/fixtures/relative-to-source.css"}
  )

  compareFixtures(
    t,
    "modules",
    "should be able to consume npm package or local modules",
    {root: __dirname, path: importsDir}
  )

  var base = "@import url(http://)"
  t.equal(
    postcss()
      .use(atImport())
      .process(base)
      .css.trim(),
      base,
      "should not fail with only one absolute import"
  )

  t.equal(
    postcss()
      .use(atImport())
      .process(
        "@import url('http://');\n@import 'test/fixtures/imports/foo.css';"
      )
      .css.trim(),
      "@import url('http://');\nfoo{}",
      "should not fail with absolute and local import"
  )

  t.end()
})

test("@import error output", function(t) {
  var file = importsDir + "/import-missing.css"
  t.throws(
    function() {
      postcss()
        .use(atImport())
        .process(fs.readFileSync(file), {from: file})
        .css.trim()
    },
    /* eslint-disable max-len */
    /import-missing.css:2:5: Failed to find 'missing-file.css' from .*\n\s+in \[/gm,
    /* eslint-enabme max-len */
    "should output readable trace"
  )

  t.end()
})

test("@import glob pattern matches no files", function(t) {
  var file = importsDir + "/glob-missing.css"
  t.equal(
    postcss()
    .use(atImport({glob: true}))
    .process(fs.readFileSync(file), {from: file})
    .css.trim(),
    "foobar{}",
    "should fail silently, skipping the globbed import, if no files found"
  )

  t.end()
})

test("@import sourcemap", function(t) {
  t.equal(
    postcss()
      .use(atImport())
      .process(read("sourcemap/in"), {
        from: "./test/sourcemap/in.css",
        to: null,
        map: {
          inline: true,
          sourcesContent: true,
        },
      })
      .css.trim(),
    read("sourcemap/out"),
    "should contain a correct sourcemap"
  )

  t.end()
})

test("@import callback", function(t) {
  postcss()
    .use(atImport({
      path: importsDir,
      onImport: function onImport(files) {
        t.deepEqual(
          files,
          [
            path.join(__dirname, "fixtures", "recursive.css"),
            path.join(__dirname, "fixtures", "imports", "foo-recursive.css"),
            path.join(__dirname, "fixtures", "imports", "bar.css"),
          ],
          "should have a callback that returns an object containing imported " +
            "files"
        )

        t.end()
      },
    }))
    .process(read("fixtures/recursive"), {
      from: "./test/fixtures/recursive.css",
    })
    .css.trim()
})

test("import relative files using path option only", function(t) {
  t.equal(
    postcss()
      .use(atImport({path: "test/fixtures/imports/relative"}))
      .process(read("fixtures/imports/relative/import"))
      .css.trim(),
    read("fixtures/imports/bar")
  )
  t.end()
})

test("inlined @import should keep PostCSS AST references clean", function(t) {
  var root = postcss()
    .use(atImport())
    .process("@import 'test/fixtures/imports/foo.css';\nbar{}")
    .root
  root.nodes.forEach(function(node) {
    t.equal(root, node.parent)
  })

  t.end()
})

test("works with no styles at all", function(t) {
  t.doesNotThrow(function() {
    postcss()
      .use(atImport())
      .process("")
      .css.trim()
  }, "should works with nothing without throwing an error")

  t.end()
})

test("@import custom resolve", function(t) {
  var resolve = require("resolve")
  var sassResolve = function(file, opts) {
    opts = opts || {}
    opts.extensions = [".scss", ".css"]
    opts.packageFilter = function(pkg) {
      pkg.main = pkg.sass || pkg.style || "index"
      return pkg
    }
    return resolve.sync(file, opts)
  }
  compareFixtures(
    t,
    "custom-resolve-modules",
    "should be able to consume modules in the custom-resolve way",
    {root: __dirname, path: importsDir, resolve: sassResolve}
  )

  t.end()
})
