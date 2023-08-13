"use strict"

const assignLayerNames = require("./assign-layer-names")
const formatImportPrelude = require("./format-import-prelude")

module.exports = function applyConditions(bundle, options, state, atRule) {
  bundle.forEach(stmt => {
    if (!stmt.conditions.length || stmt.type === "charset") {
      return
    }

    if (1 < stmt.conditions.filter(x => x.layer.length > 0).length) {
      for (const condition of stmt.conditions) {
        if (condition.layer.length > 0) {
          assignLayerNames(condition.layer, stmt.node, state, options)
        }
      }
    }

    if (stmt.type === "import") {
      if (stmt.conditions.length === 1) {
        stmt.node.params = `${stmt.fullUri} ${formatImportPrelude(
          stmt.conditions[0].layer,
          stmt.conditions[0].media,
          stmt.conditions[0].supports
        )}`
      } else {
        const reverseConditions = stmt.conditions.slice().reverse()
        const first = reverseConditions.pop()
        let params = `${stmt.fullUri} ${formatImportPrelude(
          first.layer,
          first.media,
          first.supports
        )}`

        for (const condition of reverseConditions) {
          params = `'data:text/css;base64,${btoa(
            `@import ${params}`
          )}' ${formatImportPrelude(
            condition.layer,
            condition.media,
            condition.supports
          )}`
        }

        stmt.node.params = params
      }

      return
    }

    const { nodes } = stmt
    const { parent } = nodes[0]

    const atRules = []

    // Convert conditions to at-rules
    for (const condition of stmt.conditions) {
      if (condition.media.length > 0) {
        const mediaNode = atRule({
          name: "media",
          params: condition.media.join(", "),
          source: parent.source,
        })

        atRules.push(mediaNode)
      }

      if (condition.supports.length > 0) {
        const supportsNode = atRule({
          name: "supports",
          params:
            condition.supports.length === 1
              ? `(${condition.supports[0]})`
              : condition.supports.map(x => `(${x})`).join(" and "),
          source: parent.source,
        })

        atRules.push(supportsNode)
      }

      if (condition.layer.length > 0) {
        const layerNode = atRule({
          name: "layer",
          params: condition.layer.join("."),
          source: parent.source,
        })

        atRules.push(layerNode)
      }
    }

    // Add nodes to AST
    const outerAtRule = atRules.shift()
    const innerAtRule = atRules.reduce((previous, next) => {
      previous.append(next)
      return next
    }, outerAtRule)

    parent.insertBefore(nodes[0], outerAtRule)

    // remove nodes
    nodes.forEach(node => {
      node.parent = undefined
    })

    // better output
    nodes[0].raws.before = nodes[0].raws.before || "\n"

    // wrap new rules with media query and/or layer at rule
    innerAtRule.append(nodes)

    stmt.type = "nodes"
    stmt.nodes = [outerAtRule]
    delete stmt.node
  })
}
