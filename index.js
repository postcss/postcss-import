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

    var parsedStylesResult = parseStyles(
      result,
      styles,
      opts,
      state,
      [],
      createProcessor(result, options.plugins)
    )

    function onParseEnd(ignored) {
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
    }

    return parsedStylesResult.then(onParseEnd)
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
      instance.node,
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
      if (Array.isArray(item)) {
        item = item.filter(function(instance) {
          return instance
        })
        ignored = ignored.concat(item)
      }
      else if (item) {
        ignored.push(item)
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
  atRule,
  parsedAtImport,
  options,
  state,
  media,
  processor
) {
  // adjust media according to current scope
  media = resolveMedia(media, parsedAtImport.media)

  // just update protocol base uri (protocol://url) or protocol-relative
  // (//url) if media needed
  if (parsedAtImport.uri.match(/^(?:[a-z]+:)?\/\//i)) {
    parsedAtImport.media = media

    // detach
    atRule.remove()

    return Promise.resolve(parsedAtImport)
  }

  var dir = atRule.source && atRule.source.input && atRule.source.input.file
    ? path.dirname(path.resolve(options.root, atRule.source.input.file))
    : options.root

  addInputToPath(options)

  return Promise.resolve().then(function() {
    if (options.resolve) {
      return options.resolve(parsedAtImport.uri, dir, options)
    }
    return resolveId(parsedAtImport.uri, dir, options.path)
  }).then(function(resolvedFilename) {
    if (options.skipDuplicates) {
      // skip files already imported at the same scope
      if (
        state.importedFiles[resolvedFilename] &&
        state.importedFiles[resolvedFilename][media]
      ) {
        atRule.remove()
        return Promise.resolve()
      }

      // save imported files to skip them next time
      if (!state.importedFiles[resolvedFilename]) {
        state.importedFiles[resolvedFilename] = {}
      }
      state.importedFiles[resolvedFilename][media] = true
    }

    return readImportedContent(
      result,
      atRule,
      parsedAtImport,
      assign({}, options),
      resolvedFilename,
      state,
      media,
      processor
    )
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
  atRule,
  parsedAtImport,
  options,
  resolvedFilename,
  state,
  media,
  processor
) {
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
    atRule.remove()
    return Promise.resolve()
  }

  // skip previous imported files not containing @import rules
  if (
    state.hashFiles[fileContent] &&
    state.hashFiles[fileContent][media]
  ) {
    atRule.remove()
    return Promise.resolve()
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
  var parsedResult = parseStyles(
    result,
    newStyles,
    options,
    state,
    parsedAtImport.media,
    processor
  )

  var instances

  return parsedResult.then(function(result) {
    instances = result
    return processor.process(newStyles)
  })
  .then(function(newResult) {
    result.messages = result.messages.concat(newResult.messages)
  })
  .then(function() {
    insertRules(atRule, parsedAtImport, newStyles)
    return instances
  })
}

/**
 * insert new imported rules at the right place
 *
 * @param {Object} atRule
 * @param {Object} parsedAtImport
 * @param {Object} newStyles
 */
function insertRules(atRule, parsedAtImport, newStyles) {
  var newNodes = newStyles.nodes

  // save styles
  newNodes.forEach(function(node) {
    node.parent = undefined
  })

  // wrap rules if the @import have a media query
  if (parsedAtImport.media.length && newNodes && newNodes.length) {
    // better output
    newNodes[0].raws.before = newNodes[0].raws.before || "\n"

    // wrap new rules with media (media query)
    var wrapper = postcss.atRule({
      name: "media",
      params: parsedAtImport.media.join(", "),
      source: atRule.source,
    })

    // move nodes
    newNodes = wrapper.append(newNodes)
  }

  // replace atRule by imported nodes
  atRule.replaceWith(newNodes)
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
