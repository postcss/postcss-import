"use strict"
// builtin tooling
const path = require("path")

// internal tooling
const applyMedia = require("./lib/apply-media")
const applyRaws = require("./lib/apply-raws")
const applyStyles = require("./lib/apply-styles")
const loadContent = require("./lib/load-content")
const parseStyles = require("./lib/parse-styles")
const resolveId = require("./lib/resolve-id")

function AtImport(options) {
  options = {
    root: process.cwd(),
    path: [],
    skipDuplicates: true,
    resolve: resolveId,
    load: loadContent,
    plugins: [],
    addModulesDirectories: [],
    nameLayer: null,
    ...options,
  }

  options.root = path.resolve(options.root)

  // convert string to an array of a single element
  if (typeof options.path === "string") options.path = [options.path]

  if (!Array.isArray(options.path)) options.path = []

  options.path = options.path.map(p => path.resolve(options.root, p))

  return {
    postcssPlugin: "postcss-import",
    async Once(styles, { result, atRule, postcss }) {
      const state = {
        importedFiles: {},
        hashFiles: {},
        rootFilename: null,
        anonymousLayerCounter: 0,
      }

      if (styles.source?.input?.file) {
        state.rootFilename = styles.source.input.file
        state.importedFiles[styles.source.input.file] = {}
      }

      if (options.plugins && !Array.isArray(options.plugins)) {
        throw new Error("plugins option must be an array")
      }

      if (options.nameLayer && typeof options.nameLayer !== "function") {
        throw new Error("nameLayer option must be a function")
      }

      const bundle = await parseStyles(
        result,
        styles,
        options,
        state,
        [],
        [],
        postcss
      )

      applyRaws(bundle)
      applyMedia(bundle, options, state, atRule)
      applyStyles(bundle, styles)
    },
  }
}

AtImport.postcss = true

module.exports = AtImport
