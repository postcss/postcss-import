"use strict"

module.exports = function applyStyles(bundle, styles) {
  styles.nodes = []

  // Strip additional statements.
  bundle.forEach(stmt => {
    if (["charset", "import", "layer"].includes(stmt.type)) {
      appendNode(styles, stmt.node)
    } else if (stmt.type === "nodes") {
      stmt.nodes.forEach(node => {
        appendNode(styles, node)
      })
    }
  })
}

function appendNode(styles, node) {
  const { before } = node.raws

  node.parent = undefined
  styles.append(node)

  if (typeof before !== "undefined") {
    node.raws.before = before
  }
}
