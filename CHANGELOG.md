# 4.1.1 - 2015-01-05

- Fix irregular whitespace that throw syntax error in some environnements

# 4.1.0 - 2014-12-12

- Add `web_modules` to module directories that are used to resolve `@import` ([#13](https://github.com/postcss/postcss-import/issues/13)).

# 4.0.0 - 2014-12-11

- Ensure windows compatibility (by building on AppVeyor)
- Add `root` option

# 3.2.0 - 2014-11-24

- Add `onImport` callback that offer a way to get list of imported files ([ref](https://github.com/postcss/postcss-import/issues/9))

# 3.1.0 - 2014-11-24

- Add ability to consume local modules (fix [#12](https://github.com/postcss/postcss-import/issues/12))

# 3.0.0 - 2014-11-21

- Add ability to consume node modules ([ref](https://github.com/postcss/postcss-import/issues/7)).
This means you don't have to add `node_modules` in the path anymore (or using `@import "../node_modules/..."`).
Also, `index.css` can be ommited.

This means something like this

```css
@import "../node_modules/my-css-on-npm/index.css";
```

can be written like this

```css
@import "my-css-on-npm";
```

Dependencies of dependencies should be resolved as well.

_Note that npm resolution is done after the default local behavior._

- When importing a file multiple times in the same scope (same level of media queries), file will only be imported the first time.
This is done to avoid having multiples outputs of a npm dep used multiples times in different modules.

# 2.0.0 - 2014-11-12

- Upgrade to postcss 3

# 1.0.3 - 2014-10-29

- Fix relative import path stack

# 1.0.2 - 2014-09-16

- Move ignored import at top & adjust related media queries, to make them work (fix [#2](https://github.com/postcss/postcss-import/issues/2))
- Ignore scheme-relative absolute URLs
- Remove `parse-import` module dependency

# 1.0.1 - 2014-08-26

- Fix GNU message format
- Support empty files ([cssnext/#24](https://github.com/putaindecode/cssnext/issues/24))

# 1.0.0 - 2014-08-10

First release based on [rework-import](https://github.com/reworkcss/rework-import) v1.2.0 (mainly for fixtures)
