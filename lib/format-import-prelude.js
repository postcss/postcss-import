"use strict"

module.exports = function formatImportPrelude(layer, media, supports) {
  const parts = []

  if (layer.length) {
    const layerName = layer.join(".")

    let layerParams = "layer"
    if (layerName) {
      layerParams = `layer(${layerName})`
    }

    parts.push(layerParams)
  }

  if (supports.length === 1) {
    parts.push(`supports(${supports[0]})`)
  } else if (supports.length > 0) {
    parts.push(`supports(${supports.map(x => `(${x})`).join(" and ")})`)
  }

  if (media.length) {
    parts.push(media.join(", "))
  }

  return parts.join(" ")
}
