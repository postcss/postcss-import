var path = require("path")
var assign = require("object-assign")
var postcss = require("postcss")
var joinMedia = require("./lib/join-media")
var resolveId = require("./lib/resolve-id")
var loadContent = require("./lib/load-content")
var parseStatements = require("./lib/parse-statements")

function AtImport(options) {
  options = assign({
    root: process.cwd(),
    path: [],
    skipDuplicates: true,
    resolve: resolveId,
    load: loadContent,
    plugins: [],
  }, options)

  options.root = path.resolve(options.root)

  // convert string to an array of a single element
  if (typeof options.path === "string") {
    options.path = [ options.path ]
  }

  if (!Array.isArray(options.path)) {
    options.path = []
  }

  options.path = options.path.map(function(p) {
    return path.resolve(options.root, p)
  })

  return function(styles, result) {
    var state = {
      importedFiles: {},
      hashFiles: {},
    }

    if (styles.source && styles.source.input && styles.source.input.file) {
      state.importedFiles[styles.source.input.file] = {}
    }

    if (options.plugins && !Array.isArray(options.plugins)) {
      throw new Error("plugins option must be an array")
    }

    return parseStyles(
      result,
      styles,
      options,
      state,
      []
    ).then(function(bundle) {

      applyRaws(bundle)
      applyMedia(bundle)
      applyStyles(bundle, styles)

      if (
        typeof options.addDependencyTo === "object" &&
        typeof options.addDependencyTo.addDependency === "function"
      ) {
        Object.keys(state.importedFiles)
        .forEach(options.addDependencyTo.addDependency)
      }

      if (typeof options.onImport === "function") {
        options.onImport(Object.keys(state.importedFiles))
      }
    })
  }
}

function applyRaws(bundle) {
  bundle.forEach(function(stmt, index) {
    if (index === 0) {
      return
    }

    if (stmt.parent) {
      var before = stmt.parent.node.raws.before
      if (stmt.type === "nodes") {
        stmt.nodes[0].raws.before = before
      }
      else {
        stmt.node.raws.before = before
      }
    }
    else if (stmt.type === "nodes") {
      stmt.nodes[0].raws.before = stmt.nodes[0].raws.before || "\n"
    }
  })
}

function applyMedia(bundle) {
  bundle.forEach(function(stmt) {
    if (!stmt.media.length) {
      return
    }
    if (stmt.type === "import") {
      stmt.node.params = stmt.fullUri + " " + stmt.media.join(", ")
    }
    else if (stmt.type ==="media") {
      stmt.node.params = stmt.media.join(", ")
    }
    else {
      var nodes = stmt.nodes
      var parent = nodes[0].parent
      var mediaNode = postcss.atRule({
        name: "media",
        params: stmt.media.join(", "),
        source: parent.source,
      })

      parent.insertBefore(nodes[0], mediaNode)

      // remove nodes
      nodes.forEach(function(node) {
        node.parent = undefined
      })

      // better output
      nodes[0].raws.before = nodes[0].raws.before || "\n"

      // wrap new rules with media query
      mediaNode.append(nodes)

      stmt.type = "media"
      stmt.node = mediaNode
      delete stmt.nodes
    }
  })
}

function applyStyles(bundle, styles) {
  styles.nodes = []

  bundle.forEach(function(stmt) {
    if (stmt.type === "import") {
      stmt.node.parent = undefined
      styles.append(stmt.node)
    }
    else if (stmt.type === "media") {
      stmt.node.parent = undefined
      styles.append(stmt.node)
    }
    else if (stmt.type === "nodes") {
      stmt.nodes.forEach(function(node) {
        node.parent = undefined
        styles.append(node)
      })
    }
  })
}

function parseStyles(
  result,
  styles,
  options,
  state,
  media
) {
  var statements = parseStatements(result, styles)

  return Promise.all(statements.map(function(stmt) {
    stmt.media = joinMedia(media, stmt.media)

    // skip protocol base uri (protocol://url) or protocol-relative
    if (stmt.type !== "import" || /^(?:[a-z]+:)?\/\//i.test(stmt.uri)) {
      return
    }
    return resolveImportId(
      result,
      stmt,
      options,
      state
    )
  })).then(function() {
    var imports = []
    var bundle = []

    // squash statements and their children
    statements.forEach(function(stmt) {
      if (stmt.type === "import") {
        if (stmt.children) {
          stmt.children.forEach(function(child, index) {
            if (child.type === "import") {
              imports.push(child)
            }
            else {
              bundle.push(child)
            }
            // For better output
            if (index === 0) {
              child.parent = stmt
            }
          })
        }
        else {
          imports.push(stmt)
        }
      }
      else if (stmt.type === "media" || stmt.type === "nodes") {
        bundle.push(stmt)
      }
    })

    return imports.concat(bundle)
  })
}

function resolveImportId(
  result,
  stmt,
  options,
  state
) {
  var atRule = stmt.node
  var base = atRule.source && atRule.source.input && atRule.source.input.file
    ? path.dirname(atRule.source.input.file)
    : options.root

  return Promise.resolve(options.resolve(stmt.uri, base, options))
  .then(function(resolved) {
    if (!Array.isArray(resolved)) {
      resolved = [ resolved ]
    }
    return Promise.all(resolved.map(function(file) {
      return loadImportContent(
        result,
        stmt,
        file,
        options,
        state
      )
    }))
  })
  .then(function(result) {
    // Merge loaded statements
    stmt.children = result.reduce(function(result, statements) {
      if (statements) {
        result = result.concat(statements)
      }
      return result
    }, [])
  })
  .catch(function(err) {
    result.warn(err.message, { node: atRule })
  })
}

function loadImportContent(
  result,
  stmt,
  filename,
  options,
  state
) {
  var atRule = stmt.node
  var media = stmt.media
  if (options.skipDuplicates) {
    // skip files already imported at the same scope
    if (
      state.importedFiles[filename] &&
      state.importedFiles[filename][media]
    ) {
      return
    }

    // save imported files to skip them next time
    if (!state.importedFiles[filename]) {
      state.importedFiles[filename] = {}
    }
    state.importedFiles[filename][media] = true
  }

  return Promise.resolve(options.load(filename, options))
  .then(function(content) {
    if (typeof options.transform !== "function") {
      return content
    }
    return Promise.resolve(options.transform(content, filename, options))
    .then(function(transformed) {
      return typeof transformed === "string" ? transformed : content
    })
  })
  .then(function(content) {
    if (content.trim() === "") {
      result.warn(filename + " is empty", { node: atRule })
      return
    }

    // skip previous imported files not containing @import rules
    if (
      state.hashFiles[content] &&
      state.hashFiles[content][media]
    ) {
      return
    }

    return postcss(options.plugins).process(content, {
      from: filename,
      syntax: result.opts.syntax,
      parser: result.opts.parser,
    })
    .then(function(importedResult) {
      var styles = importedResult.root
      result.messages = result.messages.concat(importedResult.messages)

      if (options.skipDuplicates) {
        var hasImport = styles.some(function(child) {
          return child.type === "atrule" && child.name === "import"
        })
        if (!hasImport) {
          // save hash files to skip them next time
          if (!state.hashFiles[content]) {
            state.hashFiles[content] = {}
          }
          state.hashFiles[content][media] = true
        }
      }

      // recursion: import @import from imported file
      return parseStyles(
        result,
        styles,
        options,
        state,
        media
      )
    })
  })
}

module.exports = postcss.plugin(
  "postcss-import",
  AtImport
)
