var valueParser = require("postcss-value-parser")
var stringify = valueParser.stringify

function getMedia(params) {
  var media = []
  var last = params.reduce(function(medium, node, index) {
    if (index < 2) {
      return ""
    }
    if (node.type === "div" && node.value === ",") {
      media.push(medium)
      return ""
    }
    return medium + stringify(node)
  })
  media.push(last)
  return media
}

module.exports = function(result, styles) {
  var imports = []

  styles.walkAtRules("import", function(atRule) {
    if (atRule.nodes) {
      return result.warn(
        "It looks like you didn't end your @import statement correctly. " +
        "Child nodes are attached to it.",
        { node: atRule }
      )
    }

    var params = valueParser(atRule.params).nodes
    var instance = {
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
      instance.uri = params[0].value
    }
    else {
      instance.uri = params[0].nodes[0].value
    }
    instance.fullUri = stringify(params[0])

    if (params.length > 2) {
      if (params[1].type !== "space") {
        return result.warn(
          "Invalid import media statement",
          { node: atRule }
        )
      }
      instance.media = getMedia(params)
    }

    imports.push(instance)
  })

  return imports
}