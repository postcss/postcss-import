"use strict"

module.exports = function applyRaws(bundle) {
  bundle.forEach((stmt, index) => {
    if (index === 0) return

    if (stmt.type === "nodes") delete stmt.nodes[0].raws.before
    else if (stmt.parent) delete stmt.node.raws.before
  })
}
