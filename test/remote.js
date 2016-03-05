import test from "ava"
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
