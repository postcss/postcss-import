"use strict"

const astCheckerPlugin = () => {
  return {
    postcssPlugin: "ast-checker-plugin",
    OnceExit(root) {
      root.walkAtRules(node => {
        if (typeof node.params !== "string") {
          throw node.error(
            `Params must be of type 'string', found '${typeof node.params}' instead`,
          )
        }

        if (typeof node.type !== "string") {
          throw node.error(
            `Type must be of type 'string', found '${typeof node.type}' instead`,
          )
        }

        if (node.type !== "atrule") {
          throw node.error(
            `Type must be 'atrule', found '${node.type}' instead`,
          )
        }

        if (typeof node.name !== "string") {
          throw node.error(
            `Name must be of type 'string', found '${typeof node.name}' instead`,
          )
        }

        if (node.nodes && !Array.isArray(node.nodes)) {
          throw node.error(
            `Nodes must be of type 'Array' when it is present, found '${typeof node.nodes}' instead`,
          )
        }

        if (!("parent" in node)) {
          throw node.error("AtRule must have a 'parent' property")
        }
      })
    },
  }
}

astCheckerPlugin.postcss = true

module.exports = astCheckerPlugin
