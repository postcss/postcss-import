# postcss-import [![Build Status](https://travis-ci.org/postcss/postcss-import.png)](https://travis-ci.org/postcss/postcss-import)

A [PostCSS](https://github.com/postcss/postcss) plugin to import stylesheets using `@import` and an optional media query.

## Installation

```bash
npm install postcss-import
```

## Usage


```js
var postcss = require("postcss")
var atImport = require("postcss-import")

var css = postcss()
  .use(atImport())
  .process(cssString)
  .css
```

```css
@import "foo.css";

@import "bar.css" (min-width: 25em);

body {
  background: black;
}
```

yields:

```css
/* ... content of foo.css */

@media (min-width: 25em) {
/* ... content of bar.css */
}

body {
  background: black;
}
```

### Options

#### encoding

Type: `String`  
Default: `utf8`

Use if your CSS is encoded in anything other than UTF-8.

#### path

Type: `String|Array`  
Default: `process.cwd()` or _dirname of [the rework source](https://github.com/reworkcss/css#cssparsecode-options)_

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


See [tests](test) for examples.


---

## Contributing

Work on a branch, install dev-dependencies, respect coding style & run tests before submitting a bug fix or a feature.

```bash
git clone https://github.com/postcss/postcss-import.git
git checkout -b patch-1
npm install
npm test
```

## [Changelog](CHANGELOG.md)

## [License](LICENSE-MIT)
