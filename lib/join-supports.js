"use strict"

module.exports = function (parentSupports, childSupports) {
  return Array.from(new Set(parentSupports.concat(childSupports)))
}
