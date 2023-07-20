"use strict"

const assignLayerNames = require("./assign-layer-names")

module.exports = function applyMedia(bundle, options, state, atRule) {
  bundle.forEach(stmt => {
    if ((!stmt.media.length && !stmt.layer.length) || stmt.type === "charset") {
      return
    }

    if (stmt.layer.length > 1) {
      assignLayerNames(stmt.layer, stmt.node, state, options)
    }

    if (stmt.type === "import") {
      const parts = [stmt.fullUri]

      const media = stmt.media.join(", ")

      if (stmt.layer.length) {
        const layerName = stmt.layer.join(".")

        let layerParams = "layer"
        if (layerName) {
          layerParams = `layer(${layerName})`
        }

        parts.push(layerParams)
      }

      if (media) {
        parts.push(media)
      }

      stmt.node.params = parts.join(" ")
    } else if (stmt.type === "media") {
      if (stmt.layer.length) {
        const layerNode = atRule({
          name: "layer",
          params: stmt.layer.join("."),
          source: stmt.node.source,
        })

        if (stmt.parentMedia?.length) {
          const mediaNode = atRule({
            name: "media",
            params: stmt.parentMedia.join(", "),
            source: stmt.node.source,
          })

          mediaNode.append(layerNode)
          layerNode.append(stmt.node)
          stmt.node = mediaNode
        } else {
          layerNode.append(stmt.node)
          delete stmt.node
          stmt.nodes = [layerNode]
          stmt.type = "nodes"
        }
      } else {
        stmt.node.params = stmt.media.join(", ")
      }
    } else {
      const { nodes } = stmt
      const { parent } = nodes[0]

      const atRules = []

      if (stmt.media.length) {
        const mediaNode = atRule({
          name: "media",
          params: stmt.media.join(", "),
          source: parent.source,
        })

        atRules.push(mediaNode)
      }

      if (stmt.layer.length) {
        const layerNode = atRule({
          name: "layer",
          params: stmt.layer.join("."),
          source: parent.source,
        })

        atRules.push(layerNode)
      }

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

      stmt.type = "media"
      stmt.node = outerAtRule
      delete stmt.nodes
    }
  })
}
