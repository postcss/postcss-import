var path = require("path")
var postcss = require("postcss")
var sugarss

module.exports = function processContent(
  result,
  content,
  filename,
  options
) {
  var plugins = options.plugins
  var ext = path.extname(filename)

  var parserList = []

  // SugarSS support:
  if (ext === ".sss") {
    if (!sugarss) {
      try {
        sugarss = require("sugarss")
      }
      catch (e) {
        // Ignore
      }
    }
    if (sugarss) return runPostcss(content, filename, plugins, [ sugarss ])
  }

  // Syntax support:
  if (result.opts.syntax && result.opts.syntax.parse) {
    parserList.push(result.opts.syntax.parse)
  }

  // Parser support:
  if (result.opts.parser) parserList.push(result.opts.parser)
  // Try the default as a last resort:
  parserList.push(null)

  return runPostcss(content, filename, plugins, parserList)
}

function runPostcss(
  content,
  filename,
  plugins,
  parsers,
  index
) {
  if (!index) index = 0
  return postcss(plugins).process(content, {
    from: filename,
    parser: parsers[index],
  })
  .catch(function(err) {
    // If there's an error, try the next parser
    index++
    // If there are no parsers left, throw it
    if (index === parsers.length) throw err
    return runPostcss(content, filename, plugins, parsers, index)
  })
}
