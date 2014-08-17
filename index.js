/**
 * Module dependencies.
 */
var fs = require("fs")
var path = require("path")

var clone = require("clone")
var postcss = require("postcss")
var findFile = require("find-file")
var urlrewrite = require("postcss-urlrewrite");
var parseImport = require("parse-import")

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
    if (!options.from && styles && styles.rules && styles.rules[0] && styles.rules[0].source && styles.rules[0].source.file) {
      options.from = styles.rules[0].source.file
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
function parseStyles(styles, options) {
  styles.eachAtRule(function checkAtRule(atRule) {
    if (atRule.name !== "import") {
      return
    }

    readAtImport(atRule, options)
  })
}

/**
 * parse @import rules & inline appropriate rules
 *
 * @param {Object} atRule  postcss atRule
 * @param {Object} options
 */
function readAtImport(atRule, options) {
  // parse-import module parse entire line
  // @todo extract what can be interesting from this one
  var parsedAtImport = parseImport("@import " + atRule.params)

  // ignore protocol base uri (protocol:// )
  if (parsedAtImport.path.match(/[a-z]+:\/\//i)) {
    return
  }

  addInputToPath(options)
  var resolvedFilename = resolveFilename(parsedAtImport.path, options.path, atRule.source)

  // add directory containing the @imported file in the paths
  // to allow local import from this file
  var dirname = path.dirname(resolvedFilename)
  if (options.path.indexOf(dirname) === -1) {
    options.path = options.path.slice()
    options.path.unshift(dirname)
  }

  // parse imported file to get rules
  var parseOptions = clone(options)
  parseOptions.from = resolvedFilename
  var newStyles = postcss.parse(readFile(resolvedFilename, options.encoding, options.transform || function(value) { return value }), parseOptions)

  // recursion: import @import from imported file
  parseStyles(newStyles, parseOptions)

  // rewrites relative paths in imported stylesheet rules to new root
  var urlRewriter = urlrewrite({rules: function(uri) {
    if (!uri.is("absolute") && uri.path()[0] !== "/") {
      var modifier = path.relative(path.dirname(options.from), dirname)
      uri.path(path.join(modifier, uri.path()))
    }
  }});
  urlRewriter(newStyles);

  // wrap rules if the @import have a media query
  if (parsedAtImport.condition && parsedAtImport.condition.length) {
    // wrap new rules with condition (media query)
    var wrapper = postcss.atRule({
      name: "media",
      params: parsedAtImport.condition
    })
    wrapper.append(newStyles)
    newStyles = wrapper

    // better output
    newStyles.before = atRule.before
    newStyles.rules[0].before = newStyles.rules[0].before || "\n"
    newStyles.after = atRule.after
  }
  else {
    newStyles.rules[0].before = atRule.before
  }

  atRule.parent.insertBefore(atRule, newStyles)

  atRule.removeSelf()
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
      (source ? source.file + (source.start ? source.start.line + ":" + source.start.column : "") + ": " : "") +
      "Failed to find " + name +
      "\n    in [ " +
      "\n        " + paths.join(",\n        ") +
      "\n    ]"
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
