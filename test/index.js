var test = require("ava")

var assign = require("object-assign")
var path = require("path")
var fs = require("fs")

var atImport = require("..")
var postcss = require("postcss")

var importsDir = path.resolve("fixtures/imports")

function read(name) {
  return fs.readFileSync(name + ".css", "utf8").trim()
}

function compareFixtures(t, name, msg, opts, postcssOpts) {
  opts = assign({ path: importsDir }, opts || {})
  return postcss(atImport(opts))
    .process(read("fixtures/" + name), postcssOpts)
    .then(trimResultCss)
    .then(function(actual) {
      var expected = read("fixtures/" + name + ".expected")
      // handy thing: checkout actual in the *.actual.css file
      fs.writeFile("fixtures/" + name + ".actual.css", actual)
      t.is(actual, expected, msg)
    }).catch(function(e) {
      console.log(name, e.stack)
    })
}

function trimResultCss(result) {
  return result.css.trim()
}

test("@import", function(t) {
  compareFixtures(t, "simple", "should import stylsheets")

  compareFixtures(t, "no-duplicate", "should not import a stylsheet twice")
  compareFixtures(
    t,
    "duplicates",
    "should be able to import a stylsheet twice",
    {
      skipDuplicates: false,
    }
  )

  compareFixtures(t, "same", "should import stylsheets with same content")

  compareFixtures(t, "ignore", "should ignore & adjust external import")

  compareFixtures(t, "glob", "should handle a glob pattern", {
    root: ".",
    glob: true,
  })

  compareFixtures(t, "glob-alt",
  "should handle a glob pattern with single quote and/or url(...)", {
    glob: true,
  })

  compareFixtures(t, "recursive", "should import stylsheets recursively")

  compareFixtures(t, "relative", "should import stylsheets relatively")

  compareFixtures(t, "empty-and-useless", "should work with empty files")

  compareFixtures(t, "transform", "should support transform", {
    transform: require("css-whitespace"),
  })

  compareFixtures(t, "plugins", "should apply plugins", {
    plugins: [
      postcss.plugin("postcss-no-foo", function() {
        return function(css) {
          css.walkDecls("foo", function(decl) {
            decl.remove()
          })
        }
      }),
      postcss.plugin("postcss-no-bar", function() {
        return function(css) {
          css.walkDecls("bar", function(decl) {
            decl.remove()
          })
        }
      }),
    ],
  })

  compareFixtures(t, "cwd", "should work without a specified path", {})

  compareFixtures(
    t,
    "relative-to-source",
    "should not need `path` option if `source` option has been passed",
    null,
    { from: "fixtures/relative-to-source.css" }
  )

  compareFixtures(
    t,
    "modules",
    "should be able to consume npm package or local modules",
    { root: "." }
  )

  var base = "@import url(http://)"
  postcss()
    .use(atImport())
    .process(base)
    .then(trimResultCss)
    .then(function(css) {
      t.is(
        css,
        base,
        "should not fail with only one absolute import"
      )
    })

  postcss()
    .use(atImport())
    .process(
      "@import url('http://');\n@import 'fixtures/imports/foo.css';"
    )
    .then(trimResultCss)
    .then(function(css) {
      t.is(
        css,
        "@import url('http://');\nfoo{}",
        "should not fail with absolute and local import"
      )
    })
})

test("@import error output", function(t) {
  var file = importsDir + "/import-missing.css"
  postcss()
    .use(atImport())
    .process(fs.readFileSync(file), { from: file })
    .catch(function(error) {
      t.throws(
        function() {
          throw error
        },
        /* eslint-disable max-len */
        /import-missing.css:2:5: Failed to find 'missing-file.css' from .*\n\s+in \[/gm,
        /* eslint-enabme max-len */
        "should output readable trace"
      )
    })
})

test("@import glob pattern matches no files", function(t) {
  var file = importsDir + "/glob-missing.css"
  postcss()
    .use(atImport({ glob: true }))
    .process(fs.readFileSync(file), { from: file })
    .then(trimResultCss)
    .then(function(css) {
      t.is(
        css,
        "foobar{}",
        "should fail silently, skipping the globbed import, if no files found"
      )
    })
})

test("@import sourcemap", function(t) {
  postcss()
    .use(atImport())
    .process(read("sourcemap/in"), {
      from: "sourcemap/in.css",
      to: null,
      map: {
        inline: false,
      },
    })
    .then(function(result) {
      t.is(
        result.map.toString(),
        fs.readFileSync("sourcemap/out.css.map", "utf8").trim(),
        "should contain a correct sourcemap"
      )
    })
})

test("@import callback", function(t) {
  postcss()
    .use(atImport({
      path: importsDir,
      onImport: function onImport(files) {
        t.same(
          files,
          [
            path.resolve("fixtures/recursive.css"),
            path.resolve("fixtures/imports/foo-recursive.css"),
            path.resolve("fixtures/imports/bar.css"),
          ],
          "should have a callback that returns an object containing imported " +
            "files"
        )
      },
    }))
    .process(read("fixtures/recursive"), {
      from: "fixtures/recursive.css",
    })
    .then(trimResultCss)
})

test("@import callback (webpack)", function(t) {
  var files = []
  var webpackMock = {
    addDependency: function(file) {
      files.push(file)
    },
  }

  postcss()
    .use(atImport({
      path: importsDir,
      addDependencyTo: webpackMock,
    }))
    .process(read("fixtures/recursive"), {
      from: "fixtures/recursive.css",
    })
    .then(trimResultCss)
    .then(function() {
      t.same(
        files,
        [
          path.resolve("fixtures/recursive.css"),
          path.resolve("fixtures/imports/foo-recursive.css"),
          path.resolve("fixtures/imports/bar.css"),
        ],
        "should have a callback shortcut for webpack"
      )
    })
})

test("import relative files using path option only", function(t) {
  postcss()
    .use(atImport({ path: "fixtures/imports/relative" }))
    .process(read("fixtures/imports/relative/import"))
    .then(trimResultCss)
    .then(function(css) {
      t.is(
        css,
        read("fixtures/imports/bar")
      )
    })
})

test("inlined @import should keep PostCSS AST references clean", function(t) {
  postcss()
    .use(atImport())
    .process("@import 'fixtures/imports/foo.css';\nbar{}")
    .then(function(result) {
      result.root.nodes.forEach(function(node) {
        t.is(result.root, node.parent)
      })
    })
})

test("works with no styles at all", function(t) {
  postcss()
    .use(atImport())
    .process("")
    .then(function() {
      t.pass("should work with no styles without throwing an error")
    })
})

test("@import custom resolve", function(t) {
  var resolve = require("resolve")
  var sassResolve = function(file, opts) {
    opts = opts || {}
    opts.extensions = [ ".scss", ".css" ]
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
    { root: ".", path: importsDir, resolve: sassResolve }
  )
})

test("warn when a import doesn't have ;", function(t) {
  postcss()
    .use(atImport())
    .process("@import url('http://') :root{}")
    .then(function(result) {
      t.is(
        result.warnings()[0].text,
        atImport.warnNodesMessage,
        "should warn when a user didn't close an import with ;"
      )
    })

  postcss()
    .use(atImport())
    .process("@import url('http://');")
    .then(function(result) {
      t.is(
        result.warnings().length,
        0,
        "should not warn when a user closed an import with ;"
      )
    })
})

test("plugins option", function(t) {
  postcss()
    .use(atImport({
      plugins: "foo",
    }))
    .process("")
    .catch(function(error) {
      t.is(
        error.message,
        "plugins option must be an array",
        "should error when value is not an array"
      )
    })

  postcss()
    .use(atImport({
      plugins: [],
    }))
    .process("")
    .then(function() {
      t.pass("should remain silent when value is an empty array")
    })
})
