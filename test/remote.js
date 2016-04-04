import test from "ava"
import postcss from "postcss"
import atImport from ".."
import compareFixtures from "./helpers/compare-fixtures"
import FixturesServer from "./helpers/fixtures-server"

const server = new FixturesServer({ root: "./fixtures/imports", port: 3333 })

test.before(() => {
  return server.listen()
})

test.after(() => {
  return server.close()
})

test("should import remote stylesheets with media queries", t => {
  return compareFixtures(t, "remote")
})

test("should throw an error if http 404 occurs", t => {
  const base = "@import url(http://localhost:3333/404)"

  return postcss()
    .use(atImport())
    .process(base)
    .then(result => {
      t.is(result.warnings().length, 1)
    })
})

test("should throw an error if http 500 occurs", t => {
  const base = "@import url(http://localhost:3333/500)"

  return postcss()
    .use(atImport())
    .process(base)
    .then(result => {
      t.is(result.warnings().length, 1)
    })
})
