"use strict"

// external tooling
const valueParser = require("postcss-value-parser")

// extended tooling
const { stringify } = valueParser

function split(params, start) {
  const list = []
  const last = params.reduce((item, node, index) => {
    if (index < start) return ""
    if (node.type === "div" && node.value === ",") {
      list.push(item)
      return ""
    }
    return item + stringify(node)
  }, "")
  list.push(last)
  return list
}

module.exports = function parseStatements(result, styles, from) {
  const statements = []
  let nodes = []

  styles.each(node => {
    let stmt
    if (node.type === "atrule") {
      if (node.name === "import") stmt = parseImport(result, node, from)
      else if (node.name === "media") stmt = parseMedia(result, node, from)
      else if (node.name === "charset") stmt = parseCharset(result, node, from)
    }

    if (stmt) {
      if (nodes.length) {
        statements.push({
          type: "nodes",
          nodes,
          media: [],
          layer: [],
          from,
        })
        nodes = []
      }
      statements.push(stmt)
    } else nodes.push(node)
  })

  if (nodes.length) {
    statements.push({
      type: "nodes",
      nodes,
      media: [],
      layer: [],
      from,
    })
  }

  return statements
}

function parseMedia(result, atRule, from) {
  const params = valueParser(atRule.params).nodes
  return {
    type: "media",
    node: atRule,
    media: split(params, 0),
    layer: [],
    from,
  }
}

function parseCharset(result, atRule, from) {
  if (atRule.prev()) {
    return result.warn("@charset must precede all other statements", {
      node: atRule,
    })
  }
  return {
    type: "charset",
    node: atRule,
    media: [],
    layer: [],
    from,
  }
}

function parseImport(result, atRule, from) {
  let prev = atRule.prev()

  // `@import` statements may follow other `@import` statements.
  if (prev) {
    do {
      if (
        prev.type === "comment" ||
        (prev.type === "atrule" && prev.name === "import")
      ) {
        prev = prev.prev()
        continue
      }

      break
    } while (prev)
  }

  // All `@import` statements may be preceded by `@charset` or `@layer` statements.
  // But the `@import` statements must be consecutive.
  if (prev) {
    do {
      if (
        prev.type === "comment" ||
        (prev.type === "atrule" &&
          (prev.name === "charset" || (prev.name === "layer" && !prev.nodes)))
      ) {
        prev = prev.prev()
        continue
      }

      return result.warn(
        "@import must precede all other statements (besides @charset or empty @layer)",
        { node: atRule }
      )
    } while (prev)
  }

  if (atRule.nodes) {
    return result.warn(
      "It looks like you didn't end your @import statement correctly. " +
        "Child nodes are attached to it.",
      { node: atRule }
    )
  }

  const params = valueParser(atRule.params).nodes
  const stmt = {
    type: "import",
    uri: "",
    fullUri: "",
    node: atRule,
    media: [],
    layer: [],
    supports: [],
    from,
  }

  for (let i = 0; i < params.length; i++) {
    const node = params[i]

    if (node.type === "space" || node.type === "comment") continue

    if (node.type === "string") {
      if (stmt.uri) {
        return result.warn(`Multiple url's in '${atRule.toString()}'`, {
          node: atRule,
        })
      }

      if (!node.value) {
        return result.warn(`Unable to find uri in '${atRule.toString()}'`, {
          node: atRule,
        })
      }

      stmt.uri = node.value
      stmt.fullUri = stringify(node)
      continue
    }

    if (node.type === "function" && /^url$/i.test(node.value)) {
      if (stmt.uri) {
        return result.warn(`Multiple url's in '${atRule.toString()}'`, {
          node: atRule,
        })
      }

      if (!node.nodes?.[0]?.value) {
        return result.warn(`Unable to find uri in '${atRule.toString()}'`, {
          node: atRule,
        })
      }

      stmt.uri = node.nodes[0].value
      stmt.fullUri = stringify(node)
      continue
    }

    if (!stmt.uri) {
      return result.warn(`Unable to find uri in '${atRule.toString()}'`, {
        node: atRule,
      })
    }

    if (
      (node.type === "word" || node.type === "function") &&
      /^layer$/i.test(node.value)
    ) {
      if (stmt.layer.length > 0) {
        return result.warn(`Multiple layers in '${atRule.toString()}'`, {
          node: atRule,
        })
      }

      if (stmt.supports.length > 0) {
        return result.warn(
          `layers must be defined before support conditions in '${atRule.toString()}'`,
          {
            node: atRule,
          }
        )
      }

      if (node.nodes) {
        stmt.layer = [stringify(node.nodes)]
      } else {
        stmt.layer = [""]
      }

      continue
    }

    if (node.type === "function" && /^supports$/i.test(node.value)) {
      if (stmt.supports.length > 0) {
        return result.warn(
          `Multiple support conditions in '${atRule.toString()}'`,
          {
            node: atRule,
          }
        )
      }

      stmt.supports = [stringify(node.nodes)]

      continue
    }

    stmt.media = split(params, i)
    break
  }

  if (!stmt.uri) {
    return result.warn(`Unable to find uri in '${atRule.toString()}'`, {
      node: atRule,
    })
  }

  if (stmt.supports.length) {
    return result.warn(
      `Supports conditions are not implemented at this time.`,
      {
        node: atRule,
      }
    )
  }

  return stmt
}
