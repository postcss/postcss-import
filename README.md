# postcss-import

[![Unix Build status](https://img.shields.io/travis/postcss/postcss-import/master.svg?branch=master&label=unix%20build)](https://travis-ci.org/postcss/postcss-import)
[![Windows Build status](https://img.shields.io/appveyor/ci/MoOx/postcss-import/master.svg?label=window%20build)](https://ci.appveyor.com/project/MoOx/postcss-import/branch/master)
[![Version](https://img.shields.io/npm/v/postcss-import.svg)](https://github.com/postcss/postcss-import/blob/master/CHANGELOG.md)

> [PostCSS](https://github.com/postcss/postcss) plugin to transform `@import`
rules by inlining content.

This plugin can consume local files, node modules or web_modules.
To resolve path of an `@import` rule, it can look into root directory
(by default `process.cwd()`), `web_modules`, `node_modules`
or local modules.
_When importing a module, it will looks for `index.css` or file referenced in
`package.json` in the `style` or `main` fields._
You can also provide manually multiples paths where to look at.

**Notes:**

- **This plugin should probably be used as the first plugin of your list.
This way, other plugins will work on the AST as if there were only a single file
to process, and will probably work as you can expect**.
- This plugin works great with
[postcss-url](https://github.com/postcss/postcss-url) plugin,
which will allow you to adjust assets `url()` (or even inline them) after
inlining imported files.
- In order to optimize output, **this plugin will only import a file once** on
a given scope (root, media query...).
Tests are made from the path & the content of imported files (using a hash
table).
If this behavior is not what you want, look at `skipDuplicates` option

## Installation

```console
$ npm install postcss-import
```

## Usage

If your stylesheets are not in the same place where you run postcss
(`process.cwd()`), you will need to use `from` option to make relative imports
work from input dirname.

```js
// dependencies
var fs = require("fs")
var postcss = require("postcss")
var atImport = require("postcss-import")

// css to be processed
var css = fs.readFileSync("css/input.css", "utf8")

// process css
postcss()
  .use(atImport())
  .process(css, {
    // `from` option is required so relative import can work from input dirname
    from: "css/input.css"
  })
  .then(function (result) {
    var output = result.css

    console.log(output)
  })
```

Using this `input.css`:

```css
/* can consume `node_modules`, `web_modules` or local modules */
@import "cssrecipes-defaults"; /* == @import "./node_modules/cssrecipes-defaults/index.css"; */
@import "normalize.css"; /* == @import "./node_modules/normalize.css/normalize.css"; */

@import "css/foo.css"; /* relative to stylesheets/ according to `from` option above */

@import "css/bar.css" (min-width: 25em);

body {
  background: black;
}
```

will give you:

```css
/* ... content of ./node_modules/cssrecipes-defaults/index.css */
/* ... content of ./node_modules/normalize.css/normalize.css */

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

#### `root`

Type: `String`  
Default: `process.cwd()` or _dirname of
[the postcss `from`](https://github.com/postcss/postcss#node-source)_

Define the root where to resolve path (eg: place where `node_modules` are).
Should not be used that much.  
_Note: nested `@import` will additionally benefit of the relative dirname of
imported files._

#### `path`

Type: `String|Array`  
Default: `[]`

A string or an array of paths in where to look for files.

#### `transform`

Type: `Function`  
Default: `null`

A function to transform the content of imported files. Take one argument (file
  content) and should return the modified content or promise with it.
`undefined` result will be skipped.

#### `plugins`

Type: `Array`  
Default: `undefined`

An array of plugins to be applied on each imported files.

#### `onImport`

Type: `Function`  
Default: `null`

Function called after the import process. Take one argument (array of imported
files).

#### `resolve`

Type: `Function`  
Default: `null`

You can overwrite the default path resolving way by setting this option.
This function gets `(id, basedir, importOptions)` arguments and returns full
path, array of paths or promise resolving paths.
You can use [resolve](https://github.com/substack/node-resolve) for that.

#### `load`

Type: `Function`  
Default: null

You can overwrite the default loading way by setting this option.
This function gets `(filename, importOptions)` arguments and returns content or
promised content.

#### `skipDuplicates`

Type: `Boolean`  
Default: `true`

By default, similar files (based on the same content) are being skipped.
It's to optimize output and skip similar files like `normalize.css` for example.
If this behavior is not what you want, just set this option to `false` to
disable it.

#### `addDependencyTo`

Type: `Function`
Default: null

Allow to generate and call a callback that take one argument, the object from
which you need to call `addDependency` from.
Called whenever a file is imported, handy in a webpack workflow.
It's equivalent to `onImport` with the following code:

```js
{
  onImport: function (files) {
    files.forEach(this.addDependency)
  }.bind(obj) // obj = the argument you should pass to `addDependencyTo()`
}
```

#### Example with some options

```js
var postcss = require("postcss")
var atImport = require("postcss-import")

postcss()
  .use(atImport({
    path: ["src/css"]
    transform: require("css-whitespace")
  }))
  .process(cssString)
  .then(function (result) {
    var css = result.css
  })
```

---

## CONTRIBUTING

* ⇄ Pull requests and ★ Stars are always welcome.
* For bugs and feature requests, please create an issue.
* Pull requests must be accompanied by passing automated tests (`$ npm test`).

## [Changelog](CHANGELOG.md)

## [License](LICENSE)
