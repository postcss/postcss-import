import test from "ava"
import compareFixtures from "./helpers/compare-fixtures"
import postcss from "postcss"
import atImport from ".."
import fs from "fs"

test.serial("should accept content", t => {
  return compareFixtures(t, "custom-load", {
    load: () => {
      return "custom-content {}"
    },
  })
})

test.serial("should accept promised content", t => {
  return compareFixtures(t, "custom-load", {
    load: () => {
      return Promise.resolve("custom-content {}")
    },
  })
})

test.serial("should support input sourcemaps with load", t => {
  return postcss()
    .use(atImport({
      resolve: (name) => {
        if (name === "imported.css") {
          return "sourcemap/imported.css"
        }
        else {
          return name
        }
      },
      load: (name) => {
        if (name === "sourcemap/in.css") {
          return fs.readFileSync("sourcemap/in.css").toString()
        }
        else {
          return {
            source: ".red,body{color:red}body{background-color:red}",
            sourceMap: fs.readFileSync("sourcemap/imported.css.map").toString(),
          }
        }
      },
    }))
    .process("@import \"sourcemap/in.css\"", {
      from: "sourcemap/in.css",
      to: null,
      map: {
        inline: false,
      },
    })
    .then(result => {
      t.is(
        result.map.toString(),
        fs.readFileSync("sourcemap/out.css.map", "utf8").trim()
      )
    })
})
