module.exports = function(parentMedia, childMedia) {
  if (!parentMedia.length && childMedia.length) {
    return childMedia
  }
  if (parentMedia.length && !childMedia.length) {
    return parentMedia
  }
  if (!parentMedia.length && !childMedia.length) {
    return []
  }

  var media = []

  parentMedia.forEach(function(parentItem) {
    childMedia.forEach(function(childItem) {
      if (parentItem !== childItem) {
        media.push(parentItem + " and " + childItem)
      }
    })
  })

  return media
}
