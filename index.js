/**
 * Module dependencies.
 */
var fs = require("fs")
var path = require("path")

var assign = require("object-assign")
var resolve = require("resolve")
var postcss = require("postcss")
var helpers = require("postcss-message-helpers")
var glob = require("glob")

/**
 * Constants
 */
var moduleDirectories = [
  "web_modules",
  "node_modules",
  "bower_components",
]

var warnNodesMessage =
  "It looks like you didn't end correctly your @import statement. " +
    "Some children nodes are attached to it."

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

  // convert string to an array of a single element
  if (typeof options.path === "string") {
    options.path = [ options.path ]
  }

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
      ignoredAtRules: [],
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
      null,
      createProcessor(result, options.plugins)
    )

    function onParseEnd() {
      addIgnoredAtRulesOnTop(styles, state.ignoredAtRules)

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
  styles.walkAtRules("import", function checkAtRule(atRule) {
    if (atRule.nodes) {
      result.warn(warnNodesMessage, { node: atRule })
    }
    if (options.glob && glob.hasMagic(atRule.params)) {
      imports = parseGlob(atRule, options, imports)
    }
    else {
      imports.push(atRule)
    }
  })

  var importResults = imports.map(function(atRule) {
    return helpers.try(function transformAtImport() {
      return readAtImport(
        result,
        atRule,
        options,
        state,
        media,
        processor
      )
    }, atRule.source)
  })

  return Promise.all(importResults)
}

/**
 * parse glob patterns (for relative paths only)
 *
 * @param {Object} atRule
 * @param {Object} options
 * @param {Array} imports
 */
function parseGlob(atRule, options, imports) {
  var globPattern = atRule.params
    .replace(/['"]/g, "")
    .replace(/(?:url\(|\))/g, "")
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
    imports.push(deglobbedAtRule)
  })
  atRule.remove()

  return imports
}

/**
 * put back at the top ignored url (absolute url)
 *
 * @param {Object} styles
 * @param {Array} state
 */
function addIgnoredAtRulesOnTop(styles, ignoredAtRules) {
  var i = ignoredAtRules.length
  if (i) {
    while (i--) {
      var ignoredAtRule = ignoredAtRules[i][0]
      ignoredAtRule.params = ignoredAtRules[i][1].fullUri +
        (ignoredAtRules[i][1].media ? " " + ignoredAtRules[i][1].media : "")

      styles.prepend(ignoredAtRule)
    }
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
  options,
  state,
  media,
  processor
) {
  // parse-import module parse entire line
  // @todo extract what can be interesting from this one
  var parsedAtImport = parseImport(atRule.params, atRule.source)

  // adjust media according to current scope
  media = parsedAtImport.media
    ? (media ? media + " and " : "") + parsedAtImport.media
    : (media ? media : null)

  // just update protocol base uri (protocol://url) or protocol-relative
  // (//url) if media needed
  if (parsedAtImport.uri.match(/^(?:[a-z]+:)?\/\//i)) {
    parsedAtImport.media = media

    // save
    state.ignoredAtRules.push([ atRule, parsedAtImport ])

    // detach
    atRule.remove()

    return Promise.resolve()
  }

  addInputToPath(options)
  var resolvedFilename = resolveFilename(
    parsedAtImport.uri,
    options.root,
    options.path,
    atRule.source,
    options.resolve
  )

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

  return parsedResult.then(function() {
    return processor.process(newStyles)
  })
  .then(function(newResult) {
    result.messages = result.messages.concat(newResult.messages)
  })
  .then(function() {
    insertRules(atRule, parsedAtImport, newStyles)
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
  if (parsedAtImport.media && parsedAtImport.media.length) {
    // better output
    if (newStyles.nodes && newStyles.nodes.length) {
      newStyles.nodes[0].raws.before = newStyles.nodes[0].raws.before || "\n"
    }

    // wrap new rules with media (media query)
    var wrapper = postcss.atRule({
      name: "media",
      params: parsedAtImport.media,
      source: atRule.source,
    })

    // move nodes
    newNodes = wrapper.append(newNodes)
  }

  // replace atRule by imported nodes
  atRule.replaceWith(newNodes)
}

/**
 * parse @import parameter
 */
function parseImport(str, source) {
  var regex = /((?:url\s?\()?(?:'|")?([^)'"]+)(?:'|")?\)?)(?:(?:\s)(.*))?/gi
  var matches = regex.exec(str)
  if (matches === null) {
    throw new Error("Unable to find uri in '" + str + "'", source)
  }

  return {
    fullUri: matches[1],
    uri: matches[2],
    media: matches[3] ? matches[3] : null,
  }
}

/**
 * Check if a file exists
 *
 * @param {String} name
 */
function resolveFilename(name, root, paths, source, resolver) {
  var dir = source && source.input && source.input.file
    ? path.dirname(path.resolve(root, source.input.file))
    : root

  try {
    var resolveOpts = {
      basedir: dir,
      moduleDirectory: moduleDirectories.concat(paths),
      paths: paths,
      extensions: [ ".css" ],
      packageFilter: function processPackage(pkg) {
        pkg.main = pkg.style || "index.css"
        return pkg
      },
    }
    var file
    resolver = resolver || resolve.sync
    try {
      file = resolver(name, resolveOpts)
    }
    catch (e) {
      // fix to try relative files on windows with "./"
      // if it's look like it doesn't start with a relative path already
      // if (name.match(/^\.\.?/)) {throw e}
      try {
        file = resolver("./" + name, resolveOpts)
      }
      catch (err) {
        // LAST HOPE
        if (!paths.some(function(dir2) {
          file = path.join(dir2, name)
          return fs.existsSync(file)
        })) {
          throw err
        }
      }
    }

    return path.normalize(file)
  }
  catch (e) {
    throw new Error(
      "Failed to find '" + name + "' from " + root +
      "\n    in [ " +
      "\n        " + paths.join(",\n        ") +
      "\n    ]",
      source
    )
  }
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
module.exports.warnNodesMessage = warnNodesMessage
