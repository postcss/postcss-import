"use strict"

const problems = require("eslint-config-problems")
const prettier = require("eslint-plugin-prettier")
const globals = require("globals")

module.exports = [
  problems,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: "commonjs",
    },
    plugins: { prettier },
    rules: {
      "prettier/prettier": [
        "error",
        {
          semi: false,
          arrowParens: "avoid",
        },
      ],
    },
  },
]
