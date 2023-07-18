"use strict"

module.exports = function (parentSupports, childSupports) {
  if (!parentSupports.length && childSupports.length) return childSupports
  if (parentSupports.length && !childSupports.length) return parentSupports
  if (!parentSupports.length && !childSupports.length) return []

  return Array.from(new Set(parentSupports.concat(childSupports)))
}
