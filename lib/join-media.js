"use strict"

/**
 * Join media queries
 * @param {string[]} parentMedia Parent media queries
 * @param {string[]} childMedia Child media queries
 * @returns {string[]} list of concatenated media queries
 */
module.exports = function joinMedia(parentMedia, childMedia) {
  if (!parentMedia.length && childMedia.length) return childMedia
  if (parentMedia.length && !childMedia.length) return parentMedia
  if (!parentMedia.length && !childMedia.length) return []

  const media = []

  parentMedia.forEach(parentItem => {
    childMedia.forEach(childItem => {
      if (parentItem !== childItem) media.push(`${parentItem} and ${childItem}`)
    })
  })

  return media
}
