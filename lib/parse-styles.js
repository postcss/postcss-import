"use strict"

const path = require("path")

const assignLayerNames = require("./assign-layer-names")
const dataURL = require("./data-url")
const joinLayer = require("./join-layer")
const joinMedia = require("./join-media")
const parseStatements = require("./parse-statements")
const processContent = require("./process-content")
const resolveId = require("./resolve-id")

async function parseStyles(
  result,
  styles,
  options,
  state,
  media,
  layer,
  from,
  postcss
) {
  const statements = parseStatements(result, styles, from)

  for (const stmt of statements) {
    stmt.media = joinMedia(media, stmt.media || [])
    stmt.parentMedia = media
    stmt.layer = joinLayer(layer, stmt.layer || [])

    if (stmt.type !== "import" || !isProcessableURL(stmt.uri)) {
      continue
    }

    if (options.filter && !options.filter(stmt.uri)) {
      // rejected by filter
      continue
    }

    await resolveImportId(result, stmt, options, state, postcss)
  }

  let charset
  const imports = []
  const bundle = []

  function handleCharset(stmt) {
    if (!charset) charset = stmt
    // charsets aren't case-sensitive, so convert to lower case to compare
    else if (
      stmt.node.params.toLowerCase() !== charset.node.params.toLowerCase()
    ) {
      throw stmt.node.error(
        `Incompatible @charset statements:
  ${stmt.node.params} specified in ${stmt.node.source.input.file}
  ${charset.node.params} specified in ${charset.node.source.input.file}`
      )
    }
  }

  // squash statements and their children
  statements.forEach(stmt => {
    if (stmt.type === "charset") handleCharset(stmt)
    else if (stmt.type === "import") {
      if (stmt.children) {
        stmt.children.forEach((child, index) => {
          if (child.type === "import") imports.push(child)
          else if (child.type === "charset") handleCharset(child)
          else bundle.push(child)
          // For better output
          if (index === 0) child.parent = stmt
        })
      } else imports.push(stmt)
    } else if (stmt.type === "media" || stmt.type === "nodes") {
      bundle.push(stmt)
    }
  })

  return charset ? [charset, ...imports.concat(bundle)] : imports.concat(bundle)
}

async function resolveImportId(result, stmt, options, state, postcss) {
  if (dataURL.isValid(stmt.uri)) {
    // eslint-disable-next-line require-atomic-updates
    stmt.children = await loadImportContent(
      result,
      stmt,
      stmt.uri,
      options,
      state,
      postcss
    )

    return
  } else if (dataURL.isValid(stmt.from.slice(-1))) {
    // Data urls can't be used a base url to resolve imports.
    // When the parent statement has a data url
    // and the current statement doesn't have a data url
    // we set the conditions to `not all`.
    stmt.media = ["not all"]
    result.warn(
      `Unable to import '${stmt.uri}' from a stylesheet which is embedded in a data url`,
      {
        node: stmt.node,
      }
    )
    return
  }

  const atRule = stmt.node
  let sourceFile
  if (atRule.source?.input?.file) {
    sourceFile = atRule.source.input.file
  }
  const base = sourceFile
    ? path.dirname(atRule.source.input.file)
    : options.root

  const paths = [await options.resolve(stmt.uri, base, options, atRule)].flat()

  // Ensure that each path is absolute:
  const resolved = await Promise.all(
    paths.map(file => {
      return !path.isAbsolute(file)
        ? resolveId(file, base, options, atRule)
        : file
    })
  )

  // Add dependency messages:
  resolved.forEach(file => {
    result.messages.push({
      type: "dependency",
      plugin: "postcss-import",
      file,
      parent: sourceFile,
    })
  })

  const importedContent = await Promise.all(
    resolved.map(file => {
      return loadImportContent(result, stmt, file, options, state, postcss)
    })
  )

  // Merge loaded statements
  // eslint-disable-next-line require-atomic-updates
  stmt.children = importedContent.flat().filter(x => !!x)
}

async function loadImportContent(
  result,
  stmt,
  filename,
  options,
  state,
  postcss
) {
  const atRule = stmt.node
  const { media, layer, from } = stmt

  assignLayerNames(layer, atRule, state, options)

  if (options.skipDuplicates) {
    // skip files already imported at the same scope
    if (state.importedFiles[filename]?.[media]?.[layer]) {
      return
    }

    // save imported files to skip them next time
    if (!state.importedFiles[filename]) {
      state.importedFiles[filename] = {}
    }
    if (!state.importedFiles[filename][media]) {
      state.importedFiles[filename][media] = {}
    }
    state.importedFiles[filename][media][layer] = true
  }

  if (from.includes(filename)) {
    return
  }

  const content = await options.load(filename, options)

  if (content.trim() === "" && options.warnOnEmpty) {
    result.warn(`${filename} is empty`, { node: atRule })
    return
  }

  // skip previous imported files not containing @import rules
  if (state.hashFiles[content]?.[media]?.[layer]) {
    return
  }

  const importedResult = await processContent(
    result,
    content,
    filename,
    options,
    postcss
  )

  const styles = importedResult.root
  result.messages = result.messages.concat(importedResult.messages)

  if (options.skipDuplicates) {
    const hasImport = styles.some(child => {
      return child.type === "atrule" && child.name === "import"
    })
    if (!hasImport) {
      // save hash files to skip them next time
      if (!state.hashFiles[content]) {
        state.hashFiles[content] = {}
      }
      if (!state.hashFiles[content][media]) {
        state.hashFiles[content][media] = {}
      }
      state.hashFiles[content][media][layer] = true
    }
  }

  // recursion: import @import from imported file
  return parseStyles(
    result,
    styles,
    options,
    state,
    media,
    layer,
    [...from, filename],
    postcss
  )
}

function isProcessableURL(uri) {
  // skip protocol base uri (protocol://url) or protocol-relative
  if (/^(?:[a-z]+:)?\/\//i.test(uri)) {
    return false
  }

  // check for fragment or query
  try {
    // needs a base to parse properly
    const url = new URL(uri, "https://example.com")

    if (url.hash) {
      return false
    }

    if (url.search) {
      return false
    }
  } catch {} // Ignore

  return true
}

module.exports = parseStyles
