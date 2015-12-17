import test from "ava"
import postcss from "postcss"
import atImport from ".."
import compareFixtures from "./lib/compare-fixtures"

test("should apply plugins", t => {
  return compareFixtures(t, "plugins", {
    plugins: [
      postcss.plugin("postcss-no-foo", () => {
        return css => {
          css.walkDecls("foo", decl => {
            decl.remove()
          })
        }
      }),
      postcss.plugin("postcss-no-bar", () => {
        return css => {
          css.walkDecls("bar", decl => {
            decl.remove()
          })
        }
      }),
    ],
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