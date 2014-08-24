# postcss-import [![Build Status](https://travis-ci.org/postcss/postcss-import.png)](https://travis-ci.org/postcss/postcss-import)

> [PostCSS](https://github.com/postcss/postcss) plugin to transform `@import` rules by inlining content.

_Note: This plugin works great with [postcss-url](https://github.com/postcss/postcss-url) plugin, which will allow you to adjust assets `url()` (or even inline them) after inlining imported files._

## Installation

    $ npm install postcss-import

## Usage

```js
// dependencies
var fs = require("fs")
var postcss = require("postcss")
var atImport = require("postcss-import")

// css to be processed
var css = fs.readFileSync("input.css", "utf8")

// process css
var output = postcss()
  .use(atImport())
  .process(css)
  .css
```

Using this `input.css`:

```css
@import "foo.css";

@import "bar.css" (min-width: 25em);

body {
  background: black;
}
```

will give you:

```css
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

#### encoding

Type: `String`  
Default: `utf8`

Use if your CSS is encoded in anything other than UTF-8.

#### path

Type: `String|Array`  
Default: `process.cwd()` or _dirname of [the postcss `from`](https://github.com/postcss/postcss#node-source)_

A string or an array of paths in where to look for files.  
_Note: nested `@import` will additionally benefit of the relative dirname of imported files._

#### transform

Type: `Function`  
Default: `null`

A function to transform the content of imported files. Take one argument (file content) & should return the modified content.

#### Example with some options

```js
var postcss = require("postcss")
var atImport = require("postcss-import")

var css = postcss()
  .use(atImport({
    path: [
      "node_modules",
    ]
    transform: require("css-whitespace")
  }))
  .process(cssString)
  .css
```

---

## Contributing

Work on a branch, install dev-dependencies, respect coding style & run tests before submitting a bug fix or a feature.

    $ git clone https://github.com/postcss/postcss-import.git
    $ git checkout -b patch-1
    $ npm install
    $ npm test

## [Changelog](CHANGELOG.md)

## [License](LICENSE)
