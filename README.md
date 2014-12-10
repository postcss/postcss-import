# postcss-import

Travis [![Travis Build Status](https://img.shields.io/travis/postcss/postcss-import.svg)](https://travis-ci.org/postcss/postcss-import) |
AppVeyor [![AppVeyor Build Status](https://img.shields.io/appveyor/ci/postcss/postcss-import.svg)](https://travis-ci.org/postcss/postcss-import)

> [PostCSS](https://github.com/postcss/postcss) plugin to transform `@import` rules by inlining content.

_Note: This plugin works great with [postcss-url](https://github.com/postcss/postcss-url) plugin, which will allow you to adjust assets `url()` (or even inline them) after inlining imported files._

## Installation

```console
$ npm install postcss-import
```

## Usage

If your stylsheets are not in the same place where you run postcss (`process.cwd()`), you will need to use `from` option to make relative imports work from input dirname.

```js
// dependencies
var fs = require("fs")
var postcss = require("postcss")
var atImport = require("postcss-import")

// css to be processed
var css = fs.readFileSync("stylesheets/input.css", "utf8")

// process css
var output = postcss({
  // `from` option is required so relative import can work from input dirname
  from: "stylesheets/input.css"
})
  .use(atImport())
  .process(css)
  .css
```

Using this `input.css`:

```css
/* can consume npm package */
@import "my-css-on-npm"; /* == @import "./node_modules/my-css-on-npm/index.css"; */

@import "foo.css"; /* relative to stylesheets/ according to `from` option above */

@import "bar.css" (min-width: 25em);

body {
  background: black;
}
```

will give you:

```css
/* ... content of ./node_modules/my-css-on-npm/index.css */

/* ... content of foo.css */

@media (min-width: 25em) {
/* ... content of bar.css */
}

body {
  background: black;
}
```

Checkout [tests](test) for more examples.

### Options

#### `encoding`

Type: `String`  
Default: `utf8`

Use if your CSS is encoded in anything other than UTF-8.

#### `path`

Type: `String|Array`  
Default: `process.cwd()` or _dirname of [the postcss `from`](https://github.com/postcss/postcss#node-source)_

A string or an array of paths in where to look for files.  
_Note: nested `@import` will additionally benefit of the relative dirname of imported files._

#### `transform`

Type: `Function`  
Default: `null`

A function to transform the content of imported files. Take one argument (file content) & should return the modified content.

#### `onImport`

Type: `Function`  
Default: `null`

Function called after the import process. Take one argument (array of imported files).

#### Example with some options

```js
var postcss = require("postcss")
var atImport = require("postcss-import")

var css = postcss()
  .use(atImport({
    path: ["src/css"]
    transform: require("css-whitespace")
  }))
  .process(cssString)
  .css
```

---

## Contributing

Work on a branch, install dev-dependencies, respect coding style & run tests before submitting a bug fix or a feature.

```console
$ git clone https://github.com/postcss/postcss-import.git
$ git checkout -b patch-1
$ npm install
$ npm test
```

## [Changelog](CHANGELOG.md)

## [License](LICENSE)
