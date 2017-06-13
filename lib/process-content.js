"use strict"

// builtin tooling
const path = require("path")

// external tooling
const postcss = require("postcss")

// placeholder tooling
let sugarss

module.exports = function processContent(result, content, filename, options) {
  const plugins = options.plugins
  const ext = path.extname(filename)

  const parserList = []

  // SugarSS support:
  if (ext === ".sss") {
    if (!sugarss) {
      try {
        sugarss = require("sugarss")
      } catch (e) {
        // Ignore
      }
    }
    if (sugarss)
      return runPostcss(content, filename, plugins, [sugarss], 0, options.sync)
  }

  // Syntax support:
  if (result.opts.syntax && result.opts.syntax.parse) {
    parserList.push(result.opts.syntax.parse)
  }

  // Parser support:
  if (result.opts.parser) parserList.push(result.opts.parser)
  // Try the default as a last resort:
  parserList.push(null)

  return runPostcss(content, filename, plugins, parserList, 0, options.sync)
}

function runPostcss(content, filename, plugins, parsers, index, sync) {
  if (!index) index = 0
  function onError(err) {
    // If there's an error, try the next parser
    index++
    // If there are no parsers left, throw it
    if (index === parsers.length) {
      throw err
    }
    return runPostcss(content, filename, plugins, parsers, index, sync)
  }

  if (sync) {
    try {
      const lazyResult = postcss(plugins).process(content, {
        from: filename,
        parser: parsers[index],
      })
      if (!lazyResult.root) {
        throw new Error("Cannot process async while in sync mode")
      }
      return lazyResult
    } catch (e) {
      onError(e)
    }
  }
  return postcss(plugins)
    .process(content, {
      from: filename,
      parser: parsers[index],
    })
    .catch(onError)
}
