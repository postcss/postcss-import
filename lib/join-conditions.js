"use strict"

const joinLayer = require("./join-layer")
const joinMedia = require("./join-media")
const joinSupports = require("./join-supports")

module.exports = function joinConditions(conditions) {
  const parts = []

  let media = []
  let supports = []
  let layer = []

  for (const condition of conditions) {
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

  return parts.join(" ")
}
