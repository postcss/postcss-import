"use strict"
// external tooling
const test = require("ava")
const postcss = require("postcss")

// plugin
const atImport = require("..")

const processor = postcss().use(atImport())

test("should warn when not @charset and not @import statement before", t => {
  return Promise.all([
    processor.process(`a {} @import "";`, { from: undefined }),
    processor.process(`@media {} @import "";`, { from: undefined }),
  ]).then(results => {
    results.forEach(result => {
      const warnings = result.warnings()
      t.is(warnings.length, 1)
      t.is(
        warnings[0].text,
        "@import must precede all other statements (besides @charset or empty @layer)",
      )
    })
  })
})

test("should warn about all imports after some other CSS declaration", t => {
  return processor
    .process(
      `
        a {}
        @import "a.css";
        @import "b.css";
      `,
      { from: undefined },
    )
    .then(result => {
      t.plan(2)
      result.warnings().forEach(warning => {
        t.is(
          warning.text,
          "@import must precede all other statements (besides @charset or empty @layer)",
        )
      })
    })
})

test("should warn if non-empty @layer before @import", t => {
  return processor
    .process(`@layer { a {} } @import "a.css";`, { from: undefined })
    .then(result => {
      t.plan(1)
      result.warnings().forEach(warning => {
        t.is(
          warning.text,
          "@import must precede all other statements (besides @charset or empty @layer)",
        )
      })
    })
})

test("should warn when import statements are not consecutive", t => {
  return processor
    .process(
      `
        @import "bar.css";
        @layer a;
        @import "bar.css";
      `,
      { from: "test/fixtures/imports/foo.css" },
    )
    .then(result => {
      t.plan(1)
      result.warnings().forEach(warning => {
        t.is(
          warning.text,
          "@import must precede all other statements (besides @charset or empty @layer)",
        )
      })
    })
})

test("should not warn if empty @layer before @import", t => {
  return processor
    .process(`@layer a; @import "";`, { from: undefined })
    .then(result => {
      const warnings = result.warnings()
      t.is(warnings.length, 1)
      t.is(warnings[0].text, `Unable to find uri in '@import ""'`)
    })
})

test("should not warn if comments before @import", t => {
  return processor
    .process(`/* skipped comment */ @import "";`, { from: undefined })
    .then(result => {
      const warnings = result.warnings()
      t.is(warnings.length, 1)
      t.is(warnings[0].text, `Unable to find uri in '@import ""'`)
    })
})

test("should warn if something before comments", t => {
  return processor
    .process(`a{} /* skipped comment */ @import "";`, { from: undefined })
    .then(result => {
      t.is(result.warnings().length, 1)
    })
})

test("should not warn when @charset or @import statement before", t => {
  return Promise.all([
    processor.process(`@import "bar.css"; @import "bar.css";`, {
      from: "test/fixtures/imports/foo.css",
    }),
    processor.process(`@charset "bar.css"; @import "bar.css";`, {
      from: "test/fixtures/imports/foo.css",
    }),
  ]).then(results => {
    results.forEach(result => {
      t.is(result.warnings().length, 0)
    })
  })
})

test("should warn when @charset is not first", t => {
  return Promise.all([
    processor.process(`a {} @charset "utf-8";`, { from: undefined }),
    processor.process(`@media {} @charset "utf-8";`, { from: undefined }),
    processor.process(`/* foo */ @charset "utf-8";`, { from: undefined }),
    processor.process(`@import "bar.css"; @charset "utf-8";`, {
      from: "test/fixtures/imports/foo.css",
    }),
  ]).then(results => {
    results.forEach(result => {
      const warnings = result.warnings()
      t.is(warnings.length, 1)
      t.is(warnings[0].text, "@charset must precede all other statements")
    })
  })
})

test("should warn when a user didn't close an import with ;", t => {
  return processor
    .process(`@import url('http://') :root{}`, { from: undefined })
    .then(result => {
      const warnings = result.warnings()
      t.is(warnings.length, 1)
      t.is(
        warnings[0].text,
        "It looks like you didn't end your @import statement correctly. " +
          "Child nodes are attached to it.",
      )
    })
})

test("should warn on invalid url", t => {
  return processor
    .process(
      `
      @import foo-bar;
      @import ;
      @import '';
      @import "";
      @import url();
      @import url('');
      @import url("");
      @import layer url("");
      @import supports(foo: bar) url("");
      `,
      { from: undefined },
    )
    .then(result => {
      const warnings = result.warnings()
      t.is(warnings.length, 9)
      t.is(warnings[0].text, `Unable to find uri in '@import foo-bar'`)
      t.is(warnings[1].text, `Unable to find uri in '@import '`)
      t.is(warnings[2].text, `Unable to find uri in '@import '''`)
      t.is(warnings[3].text, `Unable to find uri in '@import ""'`)
      t.is(warnings[4].text, `Unable to find uri in '@import url()'`)
      t.is(warnings[5].text, `Unable to find uri in '@import url('')'`)
      t.is(warnings[6].text, `Unable to find uri in '@import url("")'`)
      t.is(warnings[7].text, `Unable to find uri in '@import layer url("")'`)
      t.is(
        warnings[8].text,
        `Unable to find uri in '@import supports(foo: bar) url("")'`,
      )
    })
})

test("should warn on duplicate url's", t => {
  return processor
    .process(
      `
      @import 'foo' "bar";
      @import "foo" url(bar);
      @import url(foo) "bar";
      @import url('foo') url(bar);
      @import url('foo') layer url(bar);
      @import url('foo') layer(foo) "bar";
      @import url('foo') supports(foo: bar) url(bar);
      `,
      { from: undefined },
    )
    .then(result => {
      const warnings = result.warnings()
      t.is(warnings.length, 7)
      t.is(warnings[0].text, `Multiple url's in '@import 'foo' "bar"'`)
      t.is(warnings[1].text, `Multiple url's in '@import "foo" url(bar)'`)
      t.is(warnings[2].text, `Multiple url's in '@import url(foo) "bar"'`)
      t.is(warnings[3].text, `Multiple url's in '@import url('foo') url(bar)'`)
      t.is(
        warnings[4].text,
        `Multiple url's in '@import url('foo') layer url(bar)'`,
      )
      t.is(
        warnings[5].text,
        `Multiple url's in '@import url('foo') layer(foo) "bar"'`,
      )
      t.is(
        warnings[6].text,
        `Multiple url's in '@import url('foo') supports(foo: bar) url(bar)'`,
      )
    })
})

test("should warn on multiple layer clauses", t => {
  return processor
    .process(
      `
      @import url('foo') layer layer(bar);
      `,
      { from: undefined },
    )
    .then(result => {
      const warnings = result.warnings()
      t.is(warnings.length, 1)
      t.is(
        warnings[0].text,
        `Multiple layers in '@import url('foo') layer layer(bar)'`,
      )
    })
})

test("should warn on when support conditions precede layer clauses", t => {
  return processor
    .process(
      `
      @import url('foo') supports(selector(&)) layer(bar);
      `,
      { from: undefined },
    )
    .then(result => {
      const warnings = result.warnings()
      t.is(warnings.length, 1)
      t.is(
        warnings[0].text,
        `layers must be defined before support conditions in '@import url('foo') supports(selector(&)) layer(bar)'`,
      )
    })
})

test("should warn on multiple support conditions", t => {
  return processor
    .process(
      `
      @import url('foo') supports(selector(&)) supports((display: grid));
      `,
      { from: undefined },
    )
    .then(result => {
      const warnings = result.warnings()
      t.is(warnings.length, 1)
      t.is(
        warnings[0].text,
        `Multiple support conditions in '@import url('foo') supports(selector(&)) supports((display: grid))'`,
      )
    })
})

test("should not warn when a user closed an import with ;", t => {
  return processor
    .process(`@import url('http://');`, { from: undefined })
    .then(result => {
      t.is(result.warnings().length, 0)
    })
})
