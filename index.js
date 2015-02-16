"use strict";

/**
 * Module dependencies.
 */
var fs = require("fs")
var path = require("path")

var clone = require("clone")
var resolve = require("resolve")
var postcss = require("postcss")
var helpers = require("postcss-message-helpers")

/**
 * Constants
 */
var moduleDirectories = [
  "web_modules",
  "node_modules"
]

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
  options.root = options.root || process.cwd()
  options.path = (
    // convert string to an array of a single element
    typeof options.path === "string" ?
    [options.path] :
    (options.path || []) // fallback to empty array
  )

  return function(styles) {
    // auto add from option if possible
    if (!options.from && styles && styles.nodes && styles.nodes[0] && styles.nodes[0].source && styles.nodes[0].source.input && styles.nodes[0].source.input.file) {
      options.from = styles.nodes[0].source.input.file
    }

    // if from available, prepend from directory in the path array
    addInputToPath(options)

    // if we got nothing for the path, just use cwd
    if (options.path.length === 0) {
      options.path.push(process.cwd())
    }

    var importedFiles = {}
    if (options.from) {
      importedFiles[options.from] = {
        "": true
      }
    }
    var ignoredAtRules = []

    parseStyles(styles, options, insertRules, importedFiles, ignoredAtRules)
    addIgnoredAtRulesOnTop(styles, ignoredAtRules)

    if (typeof options.onImport === "function") {
      options.onImport(Object.keys(importedFiles))
    }
  }
}

/**
 * lookup for @import rules
 *
 * @param {Object} styles
 * @param {Object} options
 */
function parseStyles(styles, options, cb, importedFiles, ignoredAtRules, media) {
  var imports = []
  styles.eachAtRule("import", function checkAtRule(atRule) {imports.push(atRule)})
  imports.forEach(function(atRule) {
    helpers.try(function transformAtImport() {
      readAtImport(atRule, options, cb, importedFiles, ignoredAtRules, media)
    }, atRule.source)
  })
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

      // keep ast ref
      ignoredAtRule.parent = styles

      // don't use prepend() to avoid weird behavior of normalize()
      styles.nodes.unshift(ignoredAtRule)
    }

    // separate remote import a little with others rules if no newlines already
    if (first && first.before.indexOf("\n") === -1) {
      first.before = "\n\n" + first.before
    }
  }
}

/**
 * parse @import rules & inline appropriate rules
 *
 * @param {Object} atRule  postcss atRule
 * @param {Object} options
 */
function readAtImport(atRule, options, cb, importedFiles, ignoredAtRules, media) {
  // parse-import module parse entire line
  // @todo extract what can be interesting from this one
  var parsedAtImport = parseImport(atRule.params, atRule.source)

  // adjust media according to current scope
  media = parsedAtImport.media ? (media ? media + " and " : "") + parsedAtImport.media : (media ? media : null)

  // just update protocol base uri (protocol://url) or protocol-relative (//url) if media needed
  if (parsedAtImport.uri.match(/^(?:[a-z]+:)?\/\//i)) {
    parsedAtImport.media = media

    // save
    ignoredAtRules.push([atRule, parsedAtImport])

    // detach
    detach(atRule)

    return
  }

  addInputToPath(options)
  var resolvedFilename = resolveFilename(parsedAtImport.uri, options.root, options.path, atRule.source)

  // skip files already imported at the same scope
  if (importedFiles[resolvedFilename] && importedFiles[resolvedFilename][media]) {
    detach(atRule)
    return
  }

  // save imported files to skip them next time
  if (!importedFiles[resolvedFilename]) {
    importedFiles[resolvedFilename] = {}
  }
  importedFiles[resolvedFilename][media] = true


  readImportedContent(atRule, parsedAtImport, clone(options), resolvedFilename, cb, importedFiles, ignoredAtRules)
}

/**
 * insert imported content at the right place
 *
 * @param {Object} atRule
 * @param {Object} parsedAtImport
 * @param {Object} options
 * @param {String} resolvedFilename
 * @param {Function} cb
 */
function readImportedContent(atRule, parsedAtImport, options, resolvedFilename, cb, importedFiles, ignoredAtRules) {
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
    console.log(helpers.message(resolvedFilename + " is empty", atRule.source))
    detach(atRule)
    return
  }

  var newStyles = postcss.parse(fileContent, options)

  // recursion: import @import from imported file
  parseStyles(newStyles, options, cb, importedFiles, ignoredAtRules, parsedAtImport.media)

  cb(atRule, parsedAtImport, newStyles, resolvedFilename)
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

  // wrap rules if the @import have a media query
  if (parsedAtImport.media && parsedAtImport.media.length) {
    // better output
    if (newStyles.nodes && newStyles.nodes.length) {
      newStyles.nodes[0].before = newStyles.nodes[0].before || "\n"
      // newStyles.nodes[newStyles.nodes.length - 1].after =  (newStyles.nodes[newStyles.nodes.length - 1].after || "") + "\n"
    }

    // wrap new rules with media (media query)
    var wrapper = postcss.atRule({
      name: "media",
      params: parsedAtImport.media
    })

    // keep AST clean
    newNodes.forEach(function(node) {node.parent = wrapper})
    wrapper.source = atRule.source

    // copy code style
    wrapper.before = atRule.before
    wrapper.after = atRule.after

    // move nodes
    wrapper.nodes = newNodes
    newNodes = [wrapper]
  }
  else if (newNodes && newNodes.length) {
    newNodes[0].before = atRule.before
  }

  // keep AST clean
  newNodes.forEach(function(node) {node.parent = atRule.parent})

  // replace atRule by imported nodes
  var nodes = atRule.parent.nodes
  nodes.splice.apply(nodes, [nodes.indexOf(atRule), 0].concat(newNodes))
  detach(atRule)
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
    media: matches[3] ? matches[3] : null
  }
}

/**
 * Check if a file exists
 *
 * @param {String} name
 */
function resolveFilename(name, root, paths, source) {
  var dir = source && source.input && source.input.file ? path.dirname(path.resolve(root, source.input.file)) : root

  try {
    var resolveOpts = {
      basedir: dir,
      moduleDirectory: moduleDirectories.concat(paths),
      paths: paths,
      extensions: [".css"],
      packageFilter: function processPackage(pkg) {
        pkg.main = pkg.style || "index.css"
        return pkg
      }
    }
    var file
    try {
      file = resolve.sync(name, resolveOpts)
    }
    catch (e) {
      // fix to try relative files on windows with "./"
      // if it's look like it doesn't start with a relative path already
      // if (name.match(/^\.\.?/)) {throw e}
      try {
        file = resolve.sync("./" + name, resolveOpts)
      }
      catch (e) {
        // LAST HOPE
        if (!paths.some(function(dir) {
          file = path.join(dir, name)
          return fs.existsSync(file)
        })) {
          throw e
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

function detach(node) {
  node.parent.nodes.splice(node.parent.nodes.indexOf(node), 1)
}
