/**
 * Module dependencies.
 */
var fs = require("fs")
var path = require("path")

var assign = require("object-assign")
var postcss = require("postcss")
var parseStatements = require("./lib/parse-statements")
var joinMedia = require("./lib/join-media")
var resolveId = require("./lib/resolve-id")

/**
 * Inline `@import`ed files
 *
 * @param {Object} options
 */
function AtImport(options) {
  options = assign({
    root: process.cwd(),
    path: [],
    skipDuplicates: true,
    encoding: "utf8",
  }, options)

  options.root = path.resolve(options.root)

  // convert string to an array of a single element
  if (typeof options.path === "string") {
    options.path = [ options.path ]
  }

  options.path = options.path.map(function(p) {
    return path.resolve(p)
  })

  return function(styles, result) {
    var state = {
      importedFiles: {},
      hashFiles: {},
    }

    if (styles.source && styles.source.input && styles.source.input.file) {
      state.importedFiles[styles.source.input.file] = {}
    }

    return parseStyles(
      result,
      styles,
      options,
      state,
      [],
      createProcessor(result, options.plugins)
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

function createProcessor(result, plugins) {
  if (plugins) {
    if (!Array.isArray(plugins)) {
      throw new Error("plugins option must be an array")
    }
    return postcss(plugins)
  }
  return postcss()
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

/**
 * lookup for @import rules
 *
 * @param {Object} styles
 * @param {Object} options
 */
function parseStyles(
  result,
  styles,
  options,
  state,
  media,
  processor
) {
  var statements = parseStatements(result, styles)
  var importResults = statements.map(function(stmt) {
    stmt.media = joinMedia(media, stmt.media)

    if (stmt.type === "import") {
      // just update protocol base uri (protocol://url) or protocol-relative
      // (//url) if media needed
      if (stmt.uri.match(/^(?:[a-z]+:)?\/\//i)) {
        stmt.ignore = true
        return
      }
      return readAtImport(
        result,
        stmt,
        options,
        state,
        processor
      )
    }
  })

  return Promise.all(importResults).then(function() {
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

/**
 * parse @import rules & inline appropriate rules
 *
 * @param {Object} atRule  postcss atRule
 * @param {Object} options
 */
function readAtImport(
  result,
  parsedAtImport,
  options,
  state,
  processor
) {
  var atRule = parsedAtImport.node

  var base = atRule.source && atRule.source.input && atRule.source.input.file
    ? path.dirname(atRule.source.input.file)
    : options.root

  return Promise.resolve().then(function() {
    var resolver = options.resolve ? options.resolve : resolveId
    return resolver(parsedAtImport.uri, base, options)
  }).then(function(resolved) {
    if (!Array.isArray(resolved)) {
      resolved = [ resolved ]
    }
    return Promise.all(resolved.map(function(file) {
      return readImportedContent(
        result,
        parsedAtImport,
        file,
        options,
        state,
        processor
      )
    }))
  }).then(function(result) {
    parsedAtImport.children = result.reduce(function(result, statements) {
      if (statements) {
        result = result.concat(statements)
      }
      return result
    }, [])
  }).catch(function(err) {
    result.warn(err.message, { node: atRule })
  })
}

/**
 * insert imported content at the right place
 *
 * @param {Object} atRule
 * @param {Object} parsedAtImport
 * @param {Object} options
 * @param {String} resolvedFilename
 */
function readImportedContent(
  result,
  parsedAtImport,
  resolvedFilename,
  options,
  state,
  processor
) {
  var atRule = parsedAtImport.node
  var media = parsedAtImport.media
  if (options.skipDuplicates) {
    // skip files already imported at the same scope
    if (
      state.importedFiles[resolvedFilename] &&
      state.importedFiles[resolvedFilename][media]
    ) {
      return
    }

    // save imported files to skip them next time
    if (!state.importedFiles[resolvedFilename]) {
      state.importedFiles[resolvedFilename] = {}
    }
    state.importedFiles[resolvedFilename][media] = true
  }

  return new Promise(function(resolve, reject) {
    fs.readFile(resolvedFilename, options.encoding, function(err, data) {
      if (err) {
        return reject(err)
      }
      resolve(data)
    })
  }).then(function(fileContent) {
    if (typeof options.transform === "function") {
      fileContent = options.transform(fileContent, resolvedFilename)
    }

    if (fileContent.trim() === "") {
      result.warn(resolvedFilename + " is empty", { node: atRule })
      return
    }

    // skip previous imported files not containing @import rules
    if (
      state.hashFiles[fileContent] &&
      state.hashFiles[fileContent][media]
    ) {
      return
    }

    var newStyles = postcss().process(fileContent, {
      from: resolvedFilename,
      syntax: result.opts.syntax,
      parser: result.opts.parser,
    }).root

    if (options.skipDuplicates) {
      var hasImport = newStyles.some(function(child) {
        return child.type === "atrule" && child.name === "import"
      })
      if (!hasImport) {
        // save hash files to skip them next time
        if (!state.hashFiles[fileContent]) {
          state.hashFiles[fileContent] = {}
        }
        state.hashFiles[fileContent][media] = true
      }
    }

    // recursion: import @import from imported file
    return parseStyles(
      result,
      newStyles,
      options,
      state,
      media,
      processor
    ).then(function(statements) {
      return processor.process(newStyles).then(function(newResult) {
        result.messages = result.messages.concat(newResult.messages)

        return statements
      })
    })
  })
}

module.exports = postcss.plugin(
  "postcss-import",
  AtImport
)
