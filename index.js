/**
 * Module dependencies.
 */
var fs = require("fs")
var path = require("path")

var assign = require("object-assign")
var postcss = require("postcss")
var glob = require("glob")
var parseImports = require("./lib/parse-imports")
var resolveMedia = require("./lib/resolve-media")
var resolveId = require("./lib/resolve-id")

/**
 * Constants
 */
var moduleDirectories = [
  "web_modules",
  "node_modules",
]

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
  }, options || {})

  options.root = path.resolve(options.root)

  // convert string to an array of a single element
  if (typeof options.path === "string") {
    options.path = [ options.path ]
  }

  options.path = options.path.map(function(p) {
    return path.resolve(p)
  })

  return function(styles, result) {
    var opts = assign({}, options || {})

    // auto add from option if possible
    if (
      !opts.from &&
      styles.source &&
      styles.source.input &&
      styles.source.input.file
    ) {
      opts.from = styles.source.input.file
    }

    // if from available, prepend from directory in the path array
    addInputToPath(opts)

    // if we got nothing for the path, just use cwd
    if (opts.path.length === 0) {
      opts.path.push(process.cwd())
    }

    var state = {
      importedFiles: {},
      hashFiles: {},
    }
    if (opts.from) {
      state.importedFiles[opts.from] = {
        "": true,
      }
    }

    return parseStyles(
      result,
      styles,
      opts,
      state,
      [],
      createProcessor(result, options.plugins)
    ).then(function(ignored) {
      addIgnoredAtRulesOnTop(styles, ignored)

      if (
        typeof opts.addDependencyTo === "object" &&
        typeof opts.addDependencyTo.addDependency === "function"
      ) {
        Object.keys(state.importedFiles)
        .forEach(opts.addDependencyTo.addDependency)
      }

      if (typeof opts.onImport === "function") {
        opts.onImport(Object.keys(state.importedFiles))
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
  var imports = []

  parseImports(result, styles).forEach(function(instance) {
    if (options.glob && glob.hasMagic(instance.uri)) {
      parseGlob(imports, instance, options)
    }
    else {
      imports.push(instance)
    }
  })

  var importResults = imports.map(function(instance) {
    return readAtImport(
      result,
      instance,
      options,
      state,
      media,
      processor
    )
  })

  return Promise.all(importResults).then(function(result) {
    // Flatten ignored instances
    return result.reduce(function(ignored, item) {
      if (item) {
        return ignored.concat(item)
      }
      return ignored
    }, [])
  })
}

/**
 * parse glob patterns (for relative paths only)
 *
 * @param {Object} atRule
 * @param {Object} options
 * @param {Array} imports
 */
function parseGlob(imports, instance, options) {
  var atRule = instance.node
  var globPattern = instance.uri
  var paths = options.path.concat(moduleDirectories)
  var files = []
  var dir = options.source && options.source.input && options.source.input.file
    ? path.dirname(path.resolve(options.root, options.source.input.file))
    : options.root

  paths.forEach(function(p) {
    p = path.resolve(dir, p)
    var globbed = glob.sync(path.join(p, globPattern))
    globbed.forEach(function(file) {
      file = path.relative(p, file)
      files.push(file)
    })
  })

  files.forEach(function(file) {
    var deglobbedAtRule = atRule.clone({
      params: "\"" + file + "\"",
    })
    if (
      deglobbedAtRule.source &&
      deglobbedAtRule.source.input &&
      deglobbedAtRule.source.input.css
    ) {
      deglobbedAtRule.source.input.css = atRule.source.input.css
        .replace(globPattern, file)
    }
    atRule.parent.insertBefore(atRule, deglobbedAtRule)
    imports.push({
      node: deglobbedAtRule,
      uri: file,
      fullUri: "\"" + file + "\"",
      media: instance.media,
    })
  })
  atRule.remove()
}

/**
 * put back at the top ignored url (absolute url)
 *
 * @param {Object} styles
 * @param {Array} state
 */
function addIgnoredAtRulesOnTop(styles, ignoredAtRules) {
  var i = ignoredAtRules.length - 1
  while (i !== -1) {
    var ignored = ignoredAtRules[i]
    ignored.node.params = ignored.fullUri +
      (ignored.media.length ? " " + ignored.media.join(", ") : "")

    styles.prepend(ignored.node)
    i -= 1
  }
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
  media,
  processor
) {
  var atRule = parsedAtImport.node
  // adjust media according to current scope
  media = resolveMedia(media, parsedAtImport.media)

  // just update protocol base uri (protocol://url) or protocol-relative
  // (//url) if media needed
  if (parsedAtImport.uri.match(/^(?:[a-z]+:)?\/\//i)) {
    parsedAtImport.media = media
    // detach
    atRule.remove()
    return parsedAtImport
  }

  var dir = atRule.source && atRule.source.input && atRule.source.input.file
    ? path.dirname(path.resolve(options.root, atRule.source.input.file))
    : options.root

  addInputToPath(options)

  return Promise.resolve().then(function() {
    var resolver = options.resolve ? options.resolve : resolveId
    return resolver(parsedAtImport.uri, dir, options)
  }).then(function(resolved) {
    if (!Array.isArray(resolved)) {
      resolved = [ resolved ]
    }
    return Promise.all(resolved.map(function(file) {
      return readImportedContent(
        result,
        parsedAtImport,
        file,
        assign({}, options),
        state,
        media,
        processor
      )
    }))
  }).then(function(ignored) {
    compoundInstance(parsedAtImport)
    return ignored.reduce(function(ignored, instance) {
      if (instance) {
        return ignored.concat(instance)
      }
      return ignored
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
  media,
  processor
) {
  var atRule = parsedAtImport.node
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

  // add directory containing the @imported file in the paths
  // to allow local import from this file
  var dirname = path.dirname(resolvedFilename)
  if (options.path.indexOf(dirname) === -1) {
    options.path = options.path.slice()
    options.path.unshift(dirname)
  }

  options.from = resolvedFilename
  var fileContent = readFile(
    resolvedFilename,
    options.encoding,
    options.transform || function(value) {
      return value
    }
  )

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

  var newStyles = postcss.parse(fileContent, options)
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
    parsedAtImport.media,
    processor
  ).then(function(ignored) {
    return processor.process(newStyles).then(function(newResult) {
      result.messages = result.messages.concat(newResult.messages)
      var nodes = parsedAtImport.importedNodes
      var importedNodes = newStyles.nodes
      if (!nodes) {
        parsedAtImport.importedNodes = importedNodes
      }
      else if (importedNodes.length) {
        importedNodes[0].raws.before = importedNodes[0].raws.before || "\n"
        parsedAtImport.importedNodes = nodes.concat(importedNodes)
      }
      return ignored
    })
  })
}

/**
 * insert new imported rules at the right place
 *
 * @param {Object} atRule
 * @param {Object} parsedAtImport
 * @param {Object} newStyles
 */
function compoundInstance(instance) {
  var nodes = instance.importedNodes

  if (!nodes || !nodes.length) {
    instance.node.remove()
    return
  }

  // save styles
  nodes.forEach(function(node) {
    node.parent = undefined
  })

  // wrap rules if the @import have a media query
  if (instance.media.length) {
    // better output
    nodes[0].raws.before = nodes[0].raws.before || "\n"

    // wrap new rules with media query
    nodes = postcss.atRule({
      name: "media",
      params: instance.media.join(", "),
      source: instance.node.source,
    }).append(nodes)
  }

  // replace atRule by imported nodes
  instance.node.replaceWith(nodes)
}

/**
 * Read the contents of a file
 *
 * @param {String} file
 */
function readFile(file, encoding, transform) {
  return transform(fs.readFileSync(file, encoding || "utf8"), file)
}

/**
 * add `from` dirname to `path` if not already present
 *
 * @param {Object} options
 */
function addInputToPath(options) {
  if (options.from) {
    var fromDir = path.dirname(options.from)
    if (options.path.indexOf(fromDir) === -1) {
      options.path.unshift(fromDir)
    }
  }
}

module.exports = postcss.plugin(
  "postcss-import",
  AtImport
)
