"use strict";

/**
 * Module dependencies.
 */
var fs = require("fs")
var path = require("path")

var clone = require("clone")
var findFile = require("find-file")
var resolve = require("resolve")
var postcss = require("postcss")

/**
 * Expose the plugin.
 */
module.exports = AtImport

/**
 * Inline `@import`ed files
 *
 * @param {Object} options
 */
function AtImport(options) {
  options = options || {}
  options.path = (
    // convert string to an array of a single element
    typeof options.path === "string" ?
    [options.path] :
    (options.path || []) // fallback to empty array
  )

  return function(styles) {
    // auto add from option if possible
    if (!options.from && styles && styles.childs && styles.childs[0] && styles.childs[0].source && styles.childs[0].source.file) {
      options.from = styles.childs[0].source.file
    }

    // if from available, prepend from directory in the path array
    addInputToPath(options)

    // if we got nothing for the path, just use cwd
    if (options.path.length === 0) {
      options.path.push(process.cwd())
    }

    parseStyles(styles, options)
  }
}

/**
 * lookup for @import rules
 *
 * @param {Object} styles
 * @param {Object} options
 */
function parseStyles(styles, options, importedFiles, ignoredAtRules, media) {
  var isRoot = ignoredAtRules === undefined
  importedFiles = importedFiles || {}
  ignoredAtRules = ignoredAtRules || []
  styles.eachAtRule(function checkAtRule(atRule) {
    if (atRule.name !== "import") {
      return
    }

    readAtImport(atRule, options, importedFiles, ignoredAtRules, media)
  })

  if (isRoot) {
    addIgnoredAtRulesOnTop(styles, ignoredAtRules)
  }
}

/**
 * put back at the top ignored url (absolute url)
 *
 * @param {Object} styles
 * @param {Array} ignoredAtRules
 */
function addIgnoredAtRulesOnTop(styles, ignoredAtRules) {
  var i = ignoredAtRules.length
  if (i) {
    var first = styles.first

    while (i--) {
      var ignoredAtRule = ignoredAtRules[i][0]
      ignoredAtRule.params = ignoredAtRules[i][1].fullUri + (ignoredAtRules[i][1].media ? " " + ignoredAtRules[i][1].media : "")
      ignoredAtRule.before = "\n"
      ignoredAtRule.after = ""

      // don't use prepend() to avoid weird behavior of normalize()
      styles.childs.unshift(ignoredAtRule)
    }

    first.before = "\n\n" + first.before
  }
}

/**
 * parse @import rules & inline appropriate rules
 *
 * @param {Object} atRule  postcss atRule
 * @param {Object} options
 */
function readAtImport(atRule, options, importedFiles, ignoredAtRules, media) {
  // parse-import module parse entire line
  // @todo extract what can be interesting from this one
  var parsedAtImport = parseImport(atRule.params, atRule.source)

  // adjust media according to current scope
  media = parsedAtImport.media ? (media ? media + " and " : "") + parsedAtImport.media : (media ? media : null)

  // just update protocol base uri (protocol://url) or protocol-relative (//url) if media needed
  if (parsedAtImport.uri.match(/^(?:[a-z]+:)?\/\//i)) {
    parsedAtImport.media = media
    ignoredAtRules.push([atRule, parsedAtImport])
    atRule.removeSelf()
    return
  }

  addInputToPath(options)
  var resolvedFilename = resolveFilename(parsedAtImport.uri, options.path, atRule.source)

  if (importedFiles[resolvedFilename] && importedFiles[resolvedFilename][media]) {
    atRule.removeSelf()
    return
  }
  if (!importedFiles[resolvedFilename]) {
    importedFiles[resolvedFilename] = {}
  }
  importedFiles[resolvedFilename][media] = true

  insertAtImportContent(atRule, parsedAtImport, clone(options), resolvedFilename, importedFiles, ignoredAtRules)
}

/**
 * insert imported content at the right place
 *
 * @param {Object} atRule
 * @param {Object} parsedAtImport
 * @param {Object} options
 * @param {String} resolvedFilename
 * @param {Array} importedFiles
 * @param {Array} ignoredAtRules
 */
function insertAtImportContent(atRule, parsedAtImport, options, resolvedFilename, importedFiles, ignoredAtRules) {
  // add directory containing the @imported file in the paths
  // to allow local import from this file
  var dirname = path.dirname(resolvedFilename)
  if (options.path.indexOf(dirname) === -1) {
    options.path = options.path.slice()
    options.path.unshift(dirname)
  }

  options.from = resolvedFilename
  var fileContent = readFile(resolvedFilename, options.encoding, options.transform || function(value) { return value })

  if (fileContent.trim() === "") {
    console.warn(gnuMessage(resolvedFilename + " is empty", atRule.source))
    atRule.removeSelf()
    return
  }

  var newStyles = postcss.parse(fileContent, options)

  // recursion: import @import from imported file
  parseStyles(newStyles, options, importedFiles, ignoredAtRules, parsedAtImport.media)

  insertRules(atRule, parsedAtImport, newStyles)
}

/**
 * insert new imported rules at the right place
 *
 * @param {Object} atRule
 * @param {Object} parsedAtImport
 * @param {Object} newStyles
 */
function insertRules(atRule, parsedAtImport, newStyles) {
  // wrap rules if the @import have a media query
  if (parsedAtImport.media && parsedAtImport.media.length) {
    // wrap new rules with media (media query)
    var wrapper = postcss.atRule({
      name: "media",
      params: parsedAtImport.media
    })
    wrapper.append(newStyles)
    newStyles = wrapper

    // better output
    newStyles.before = atRule.before
    if (newStyles.childs && newStyles.childs.length) {
      newStyles.childs[0].before = newStyles.childs[0].before || "\n"
    }
    newStyles.after = atRule.after || "\n"
  }
  else if (newStyles.childs && newStyles.childs.length) {
    newStyles.childs[0].before = atRule.before
  }

  atRule.parent.insertBefore(atRule, newStyles)
  atRule.removeSelf()
}

/**
 * parse @import parameter
 */
function parseImport(str, source) {
  var regex = /((?:url\s?\()?(?:'|")?([^)'"]+)(?:'|")?\)?)(?:(?:\s)(.*))?/gi
  var matches = regex.exec(str)
  if (matches === null) {
    throw new Error(gnuMessage("Unable to find uri in '" + str + "'", source))
  }

  return {
    fullUri: matches[1],
    uri: matches[2],
    media: matches[3] ? matches[3] : null
  }
}

/**
 * Check if a file exists
 *
 * @param {String} name
 */
function resolveFilename(name, paths, source) {
  var file = findFile(name, {path: paths, global: false})
  if (file) {
    // if (file.length > 1) {
    //   console.warn(gnuMessage("Warning: multiples files found for `" + name + "`: " + file, source))
    // }
    return file[0]
  }

  var root = paths[paths.length - 1]
  var dir = source && source.file ? path.dirname(path.resolve(root, source.file)) : root

  try {
    file = resolve.sync(name, {
      basedir: dir,
      extensions: [".css"],
      packageFilter: function processPackage(pkg) {
        pkg.main = pkg.style || "index.css"
        return pkg
      }
    })

    return path.normalize(file)
  }
  catch (e) {
    throw new Error(
      // GNU style message
      gnuMessage(
        "Failed to find '" + name + "'" +
        "\n    in [ " +
        "\n        " + paths.join(",\n        ") +
        "\n    ]",
        source
      )
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

/**
 * return GNU style message
 *
 * @param {String} message
 * @param {Object} source
 */
function gnuMessage(message, source) {
  return (source ? (source.file ? source.file : "<css input>") + ":" + source.start.line + ":" + source.start.column + " " : "") + message
}
