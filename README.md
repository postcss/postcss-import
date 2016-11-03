# postcss-import [![Travis Build Status](https://travis-ci.org/postcss/postcss-import.svg)](https://travis-ci.org/postcss/postcss-import) [![AppVeyor Build status](https://ci.appveyor.com/api/projects/status/u8l6u3lr6s5u5tpi?svg=true)](https://ci.appveyor.com/project/MoOx/postcss-import)

> [PostCSS](https://github.com/postcss/postcss) plugin to transform `@import` rules by inlining content.

This plugin can consume local files, node modules or bower packages.
To resolve path of an `@import` rule, it can look into root directory
(by default `process.cwd()`), `node_modules`, `web_modules`, `bower_components`
or local modules.
_When importing a module, it will looks for `index.css` or file referenced in
`package.json` in the `style` field._
You can also provide manually multiples paths where to look at.

**Notes:**

- **This plugin should probably be used as the first plugin of your list. This way, other plugins will work on the AST as if there were only a single file to process, and will probably work as you can expect**.
- This plugin works great with [postcss-url](https://github.com/postcss/postcss-url) plugin,
which will allow you to adjust assets `url()` (or even inline them) after inlining imported files.
- In order to optimize output, **this plugin will only import a file once** on a given scope (root, media query...).
Tests are made from the path & the content of imported files (using a hash table).
If this behavior is not what you want, look at `skipDuplicates` option

## Installation

```console
$ npm install postcss-import
```

## Usage

If your stylesheets are not in the same place where you run postcss (`process.cwd()`), you will need to use `from` option to make relative imports work from input dirname.

```js
// dependencies
var fs = require("fs")
var postcss = require("postcss")
var atImport = require("postcss-import")

// css to be processed
var css = fs.readFileSync("css/input.css", "utf8")

// process css
var output = postcss()
  .use(atImport())
  .process(css, {
    // `from` option is required so relative import can work from input dirname
    from: "css/input.css"
  })
  .css

console.log(output)
```

Using this `input.css`:

```css
/* can consume `node_modules`, `web_modules`, `bower_components` or local modules */
@import "cssrecipes-defaults"; /* == @import "./node_modules/cssrecipes-defaults/index.css"; */

@import "normalize.css/normalize"; /* == @import "./bower_components/normalize.css/normalize.css"; */

@import "css/foo.css"; /* relative to stylesheets/ according to `from` option above */

@import "css/bar.css" (min-width: 25em);

body {
  background: black;
}
```

will give you:

```css
/* ... content of ./node_modules/my-css-on-npm/index.css */

/* ... content of ./bower_components/my-css-on-bower/index.css */

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
Default: `process.cwd()`

Define the root where to resolve path (eg: place where `node_modules` and `bower_components` are). Should not be used that much.

#### `path`

Type: `String|Array`  
Default: `process.cwd()` or _dirname of [the postcss `from`](https://github.com/postcss/postcss#node-source)_

A string or an array of paths in where to look for files.  
_Note: nested `@import` will additionally benefit of the relative dirname of imported files._

#### `async`

Type: `Boolean`  
Default: `false`

Allow to enable PostCSS async API usage. Before enabling this, check that your
runner allow async usage.
_Note: this is not enabling async fs read yet._

#### `transform`

Type: `Function`  
Default: `null`

A function to transform the content of imported files. Take one argument (file content) & should return the modified content.

#### `plugins`

Type: `Array`  
Default: `undefined`

An array of plugins to be applied on each imported file.

#### `encoding`

Type: `String`  
Default: `utf8`

Use if your CSS is encoded in anything other than UTF-8.

#### `onImport`

Type: `Function`  
Default: `null`

Function called after the import process. Take one argument (array of imported files).

#### `glob`

Type: `Boolean`  
Default: `false`

Set to `true` if you want @import rules to parse glob patterns.

#### `resolve`

Type: `Function`  
Default: `null`

You can overwrite the default path resolving way by setting this option, using the `resolve.sync(id, opts)` signature that [resolve.sync](https://github.com/substack/node-resolve#resolvesyncid-opts) has.

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

var css = postcss()
  .use(atImport({
    path: ["src/css"]
    transform: require("css-whitespace")
  }))
  .process(cssString)
  .css
```

---

## CONTRIBUTING

* ⇄ Pull requests and ★ Stars are always welcome.
* For bugs and feature requests, please create an issue.
* Pull requests must be accompanied by passing automated tests (`$ npm test`).

## [Changelog](CHANGELOG.md)

## [License](LICENSE)
