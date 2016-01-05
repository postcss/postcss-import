var valueParser = require("postcss-value-parser")
var stringify = valueParser.stringify

function split(params, start) {
  var list = []
  var last = params.reduce(function(item, node, index) {
    if (index < start) {
      return ""
    }
    if (node.type === "div" && node.value === ",") {
      list.push(item)
      return ""
    }
    return item + stringify(node)
  }, "")
  list.push(last)
  return list
}

module.exports = function(result, styles) {
  var statements = []

  styles.each(function(atRule) {
    if (atRule.type !== "atrule" || atRule.name !== "import") {
      return
    }

    var prev = atRule.prev()
    if (prev) {
      if (
        prev.type !== "atrule" ||
        prev.name !== "import" &&
        prev.name !== "charset"
      ) {
        return result.warn(
          "@import must precede all other statements (besides @charset)",
          { node: atRule }
        )
      }
    }

    if (atRule.nodes) {
      return result.warn(
        "It looks like you didn't end your @import statement correctly. " +
        "Child nodes are attached to it.",
        { node: atRule }
      )
    }

    var params = valueParser(atRule.params).nodes
    var stmt = {
      type: "import",
      node: atRule,
      media: [],
    }

    if (
      !params.length ||
      (
        params[0].type !== "string" ||
        !params[0].value
      ) &&
      (
        params[0].type !== "function" ||
        params[0].value !== "url" ||
        !params[0].nodes.length ||
        !params[0].nodes[0].value
      )
    ) {
      return result.warn(
        "Unable to find uri in '" + atRule.toString() + "'",
        { node: atRule }
      )
    }

    if (params[0].type === "string") {
      stmt.uri = params[0].value
    }
    else {
      stmt.uri = params[0].nodes[0].value
    }
    stmt.fullUri = stringify(params[0])

    if (params.length > 2) {
      if (params[1].type !== "space") {
        return result.warn(
          "Invalid import media statement",
          { node: atRule }
        )
      }
      stmt.media = split(params, 2)
    }

    statements.push(stmt)
  })

  return statements
}
