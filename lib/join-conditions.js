"use strict"

const formatImportPrelude = require("./format-import-prelude")
const joinLayer = require("./join-layer")
const joinMedia = require("./join-media")
const joinSupports = require("./join-supports")

module.exports = function joinConditions(conditions) {
  let layer = []
  let media = []
  let supports = []

  for (const condition of conditions) {
    layer = joinLayer(layer, condition.layer)
    media = joinMedia(media, condition.media)
    supports = joinSupports(supports, condition.supports)
  }

  return formatImportPrelude(layer, media, supports)
}
