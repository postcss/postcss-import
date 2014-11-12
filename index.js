/**
 * Module dependencies.
 */
var fs = require("fs")
var path = require("path")

var clone = require("clone")
var postcss = require("postcss")
var findFile = require("find-file")

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
function parseStyles(styles, options, ignoredAtRules, media) {
  var isRoot = ignoredAtRules === undefined
  ignoredAtRules = ignoredAtRules || []
  styles.eachAtRule(function checkAtRule(atRule) {
    if (atRule.name !== "import") {
      return
    }

    readAtImport(atRule, options, ignoredAtRules, media)
  })

  if (isRoot) {
    var i = ignoredAtRules.length
    if (i) {
      var first = styles.first
      while (i--) {
        var ignoredAtRule = ignoredAtRules[i][0]
        ignoredAtRule.params = ignoredAtRules[i][1].fullUri + (ignoredAtRules[i][1].media ? " " + ignoredAtRules[i][1].media : "")
        styles.prepend(ignoredAtRule)
      }

      first.before = "\n" + first.before
    }
  }
}

/**
 * parse @import rules & inline appropriate rules
 *
 * @param {Object} atRule  postcss atRule
 * @param {Object} options
 */
function readAtImport(atRule, options, ignoredAtRules, media) {
  // parse-import module parse entire line
  // @todo extract what can be interesting from this one
  var parsedAtImport = parseImport(atRule.params, atRule.source)

  // ignore protocol base uri (protocol://url) or protocol-relative (//url)
  if (parsedAtImport.uri.match(/^(?:[a-z]+:)?\/\//i)) {
    parsedAtImport.media = parsedAtImport.media ? (media ? media + " and " : "") + parsedAtImport.media : (media ? media : null)
    ignoredAtRules.push([atRule, parsedAtImport])
    atRule.removeSelf()
    return
  }

  addInputToPath(options)
  var resolvedFilename = resolveFilename(parsedAtImport.uri, options.path, atRule.source)

  // parse imported file to get rules
  var parseOptions = clone(options)

  // add directory containing the @imported file in the paths
  // to allow local import from this file
  var dirname = path.dirname(resolvedFilename)
  if (parseOptions.path.indexOf(dirname) === -1) {
    parseOptions.path = parseOptions.path.slice()
    parseOptions.path.unshift(dirname)
  }

  parseOptions.from = resolvedFilename
  var fileContent = readFile(resolvedFilename, options.encoding, options.transform || function(value) { return value })
  if (fileContent.trim() === "") {
    console.warn(gnuMessage(resolvedFilename + " is empty", atRule.source))
  }
  else {
    var newStyles = postcss.parse(fileContent, parseOptions)

    // recursion: import @import from imported file
    parseStyles(newStyles, parseOptions, ignoredAtRules, parsedAtImport.media)

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
  }

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
  if (!file) {
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

  return file[0]
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
