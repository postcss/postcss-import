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

module.exports = function parseStatements(result, styles, conditions, from) {
  const statements = []
  let nodes = []

  styles.each(node => {
    let stmt
    if (node.type === "atrule") {
      if (node.name === "import")
        stmt = parseImport(result, node, conditions, from)
      else if (node.name === "charset")
        stmt = parseCharset(result, node, conditions, from)
    }

    if (stmt) {
      if (nodes.length) {
        statements.push({
          type: "nodes",
          nodes,
          conditions: [...conditions],
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
      conditions: [...conditions],
      from,
    })
  }

  return statements
}

function parseCharset(result, atRule, conditions, from) {
  if (atRule.prev()) {
    return result.warn("@charset must precede all other statements", {
      node: atRule,
    })
  }
  return {
    type: "charset",
    node: atRule,
    conditions: [...conditions],
    from,
  }
}

function parseImport(result, atRule, conditions, from) {
  let prev = atRule.prev()
  if (prev) {
    do {
      if (
        prev.type !== "comment" &&
        (prev.type !== "atrule" ||
          (prev.name !== "import" &&
            prev.name !== "charset" &&
            !(prev.name === "layer" && !prev.nodes)))
      ) {
        return result.warn(
          "@import must precede all other statements (besides @charset or empty @layer)",
          { node: atRule }
        )
      }
      prev = prev.prev()
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
    conditions: [...conditions],
    from,
  }

  let layer = []
  let media = []
  let supports = []

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
      if (node.nodes) {
        layer = [stringify(node.nodes)]
      } else {
        layer = [""]
      }

      continue
    }

    if (node.type === "function" && /^supports$/i.test(node.value)) {
      supports = [stringify(node.nodes)]

      continue
    }

    media = split(params, i)
    break
  }

  if (!stmt.uri) {
    return result.warn(`Unable to find uri in '${atRule.toString()}'`, {
      node: atRule,
    })
  }

  if (media.length > 0 || layer.length > 0 || supports.length > 0) {
    stmt.conditions.push({
      layer,
      media,
      supports,
    })
  }

  return stmt
}
