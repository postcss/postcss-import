import test from "ava"
import compareFixtures from "./helpers/compare-fixtures"
import path from "path"

test.serial("should accept file", t => {
  return compareFixtures(t, "custom-resolve-file", {
    resolve: () => {
      return path.resolve("fixtures/imports/custom-resolve-1.css")
    },
  })
})

test.serial("should accept promised file", t => {
  return compareFixtures(t, "custom-resolve-file", {
    resolve: () => {
      return Promise.resolve(
        path.resolve("fixtures/imports/custom-resolve-1.css")
      )
    },
  })
})

test.serial("should accept array of files", t => {
  return compareFixtures(t, "custom-resolve-array", {
    resolve: () => {
      return [
        path.resolve("fixtures/imports/custom-resolve-1.css"),
        path.resolve("fixtures/imports/custom-resolve-2.css"),
        path.resolve("fixtures/imports/custom-resolve-1.css"),
      ]
    },
  })
})

test.serial("should accept promised array of files", t => {
  return compareFixtures(t, "custom-resolve-array", {
    resolve: () => {
      return Promise.resolve([
        path.resolve("fixtures/imports/custom-resolve-1.css"),
        path.resolve("fixtures/imports/custom-resolve-2.css"),
        path.resolve("fixtures/imports/custom-resolve-1.css"),
      ])
    },
  })
})
