# Chocola Changelog

## 2.0.0-next.3

- Removed `del-if` support [#32]
- Removed dynamic asset bundling support (`src`, `href`, `url()`) [#39]

## 2.0.0-next.2 (Jul 23, 2029)

- Perfomance optimizations, including:
  - Double-processing of DOM elements [[#35](https://github.com/sad-gabi/chocola/issues/35)]
  - Repeated new `Function(...)` compilation [[#36](https://github.com/sad-gabi/chocola/issues/36)]
  - `extractContextFromElement` recreates `Function` per attribute [[#37](https://github.com/sad-gabi/chocola/issues/37)]
  - `validateChainStructure` line-number search is O(n²) [[#40](https://github.com/sad-gabi/chocola/issues/40)]
  - `genRandomId` re-declares `letters` const on every call [[#41](https://github.com/sad-gabi/chocola/issues/41)]
  - `incrementAlfabet` uses `indexOf` per character [[#43](https://github.com/sad-gabi/chocola/issues/43)]
  - `interpolateNode` recursive without depth guard [[#44](https://github.com/sad-gabi/chocola/issues/44)]
  - Dev server uses two separate `fs.watch` calls [[#42](https://github.com/sad-gabi/chocola/issues/42)]
  - `app.build` ignores the returned promise [[#45](https://github.com/sad-gabi/chocola/issues/45)]

## 2.0.0-next.1 (Jul 23, 2026)

- Moved main Chocola imports [[#33](https://github.com/sad-gabi/chocola/issues/33)]:
  - `{app}` to `chocola/compiler`
  - `{dev}` to `chocola/dev`
- Added JSDocs for `{dev}`.

---

## 1.6.0 (Jul 23, 2026)

### Added features
- Added `del:if` as a replacement for `del-if` and deprecated the last one [[#27]](https://github.com/sad-gabi/chocola/issues/27).
- CSS animations scoping [[#30]](https://github.com/sad-gabi/chocola/issues/30).

### Fixed bugs
- A bug that would turn `{foo}` at `index.html` into strings [[#25]](https://github.com/sad-gabi/chocola/issues/25).
- A bug that would make the compiler skip evaluating all Chocola syntax that were not direct children of the `<app>` container [[#29]](https://github.com/sad-gabi/chocola/issues/29).
- A bug that would treat CSS non-selector at-rules as common rules and breake them [[#26]](https://github.com/sad-gabi/chocola/issues/26)

### Optimization
- Remove code for processing `.choco` files since they were never implemented and aren´t planned to be either [[#28]](https://github.com/sad-gabi/chocola/issues/28).

## 1.5.2 (Jul 20, 2026)

- Updated npm package description, homepage, and funding.
- Updated README.md

## 1.5.1 (Jul 19, 2026)

- Fixed a critical bug that would make the `npm install` process to crash while installing v1.5.0.
- Improved component loading, errors, and assets

## 1.5.0 (Jul 19, 2026) [DEPRECATED]

**DEPRECATION WARNING:** This version has a serious error that will cause the `npm install` process to crash. Please install a different version instead.

### Added
- Assets now can be imported from a `src/static/` directory instead of based on `src` and `href` HTML attributes or `url()` CSS functions setting `bundle.assetImport: "static"` config.
- Imports from HTML `href` and `src` attributes in `body`, and from CSS `url()` functions are still the default imports system, but now are deprecated and expected to be removed in Chocola 2. The `bundle.assetImport` value for static imports is `"legacy"`.
- Added support for using curly braces HTML entities.
- Added `elif` and `else` logical blocks; they must be siblings of an `if` block and arrenged in order.
- Added `<void>` HTML tags as wrappers that will be replaced for its children when rendered, being able to apply logic blocks like `if` to their children.
- Now scoped CSS selector also applies to the component's root element.

### Fixed
- Fixed an import resolution crash when a component's HTML template content was shorter than its import statement, which caused subsequent imports to be silently dropped during the build.

## Refactor

- Improve component loading, errors, and assets.

---

## 1.4.2 (Jul 16, 2026)
- Fixed JS expressions evaluations.

## 1.4.1 (May 03, 2026)
- Fixed CSS imports: now Chocola won't try to resolve `http:` and `https:` import URLs.

## 1.4.0 (May 03, 2026)
- Added support for injecting components inside another using the `<SLOT>` element function.
- Nested components (declared components inside another component body template) now render.

---

## 1.3.11 (Mar 02, 2026)

- Added support for using `:root` selector as a placeholder for a component root element.
- Now hash CSS classes are applied for all instances of a component and not just the first one.
- Nested styles, as CSS inside `@media` rules, now are scoped.

## 1.3.10 (Feb 26, 2026)

- Removed debug logs from source code.

## 1.3.9 (Feb 26, 2026)

- Added resources packaging for HTML inline styles.
- Resources imported from scoped and global CSS files now are packaged too.

## 1.3.8 (Feb 26, 2026)

- Now Chocola evaluates JS expressions in content bindings.

## 1.3.7 (Feb 21, 2026)

- Rewrote README to a shorter version with a direct link to documentation.

## 1.3.6 (Feb 21, 2026)

- Added CSS scoping for components: all scoped CSS is saved insida a `sc-${randomId}.css` file in build.

## 1.3.5 (Feb 20, 2026)

- Removed packed `.tgz` files that were uploaded to the NPM registry.

## 1.3.4 (Feb 20, 2026)

- Fixed the following CTX handling:
  - HTML templates still needed `{ctx.name}` format. Changed to `{name}`.
  - `if` and `del-if` were being evaluated with `name` variables instead of `ctx.name`. Now fixed.
- Removed `chocola/types` submodule. Will be replaced with TypeScript support.
- Now the compiler removes the `if` attribute for static conditional rendering.
- Optimized `if` and `del-if` handling code.

## 1.3.3 (Feb 20, 2026)

- Now components CTX is declared as `propertyName` instead of `ctx.propertyName`.

## 1.3.2 (Feb 20, 2026)

- Components now render inner HTML declared as children, replacing each `<SLOT>` element with the actual child markup.
