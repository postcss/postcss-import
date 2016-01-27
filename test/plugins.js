import test from "ava"
import postcss from "postcss"
import scss from "postcss-scss"
import atImport from ".."
import compareFixtures from "./lib/compare-fixtures"

test("should apply plugins to root", t => {
  const atRules = []
  const rules = []
  return compareFixtures(t, "plugins", {
    plugins: [
      css => {
        css.walk(node => {
          if (node.type === "rule") {
            rules.push(node.selector)
            if (node.selector === "bar") {
              node.remove()
            }
            else {
              node.selector += "-converted"
            }
          }
          if (node.type === "atrule") {
            atRules.push(node.name)
          }
        })
      },
    ],
  })
  .then(() => {
    t.same(atRules, [ "import" ])
    t.same(rules, [ "bar", "foo" ])
  })
})

test("should error when value is not an array", t => {
  return postcss()
    .use(atImport({
      plugins: "foo",
    }))
    .process("")
    .catch(error => {
      t.is(error.message, "plugins option must be an array")
    })
})

test("should remain silent when value is an empty array", () => {
  return postcss()
    .use(atImport({
      plugins: [],
    }))
    .process("")
})

test("should process custom syntax", t => {
  return compareFixtures(t, "scss-syntax", null, {
    syntax: scss,
  })
})

test("should process custom syntax by parser", t => {
  return compareFixtures(t, "scss-parser", null, {
    parser: scss,
  })
})
