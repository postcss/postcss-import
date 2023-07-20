"use strict"

const assignLayerNames = require("./assign-layer-names")
const joinLayer = require("./join-layer")
const joinMedia = require("./join-media")
const joinSupports = require("./join-supports")

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
      const parts = [stmt.fullUri]

      let media = []
      let supports = []
      let layer = []

      for (const condition of stmt.conditions) {
        media = joinMedia(media, condition.media)
        supports = joinSupports(supports, condition.supports)
        layer = joinLayer(layer, condition.layer)
      }

      if (layer.length) {
        const layerName = layer.join(".")

        let layerParams = "layer"
        if (layerName) {
          layerParams = `layer(${layerName})`
        }

        parts.push(layerParams)
      }

      if (supports.length) {
        if (supports.length === 1) {
          parts.push(`supports(${supports[0]})`)
        } else {
          parts.push(`supports(${supports.map(x => `(${x})`).join(" and ")})`)
        }
      }

      if (media.length) {
        parts.push(media.join(", "))
      }

      stmt.node.params = parts.join(" ")

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
    for (let i = 0; i < atRules.length - 1; i++) {
      atRules[i].append(atRules[i + 1])
    }

    const innerAtRule = atRules[atRules.length - 1]
    const outerAtRule = atRules[0]

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
