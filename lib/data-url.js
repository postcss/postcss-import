"use strict"

const dataURLRegexp = /^data:text\/css;base64,/i

function isValid(url) {
  return dataURLRegexp.test(url)
}

function contents(url) {
  // "data:text/css;base64,".length == 21
  return atob(url.slice(21))
}

module.exports = {
  isValid,
  contents,
}
