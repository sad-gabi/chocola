# Chocola Changelog

## 1.3.7 (Feb 21, 2026)

- Rewrote README to a shorter version with a direct link to documentation.

## 1.3.6 (Feb 21, 2026)

- Added CSS scoping for components: all scoped CSS is saved insida a `sc-${randomId}.css` file in build.

## 1.3.5 (Feb 20, 2026)

- Removed packed `.tgz` files that were uploaded to the NPM registry.

## 1.3.4 (Feb 20, 2026)

### CTX Handling

- Fixed the following CTX handling:
  - HTML templates still needed `{ctx.name}` format. Changed to `{name}`.
  - `if` and `del-if` were being evaluated with `name` variables instead of `ctx.name`. Now fixed.

### Removed `chocola/types`

- Removed `chocola/types` submodule. Will be replaced with TypeScript support.

### `if` and `del-if` Attributes Optimization

- Now the compiler removes the `if` attribute for static conditional rendering.
- Optimized `if` and `del-if` handling code.

---

## 1.3.3 (Feb 20, 2026)

### CTX Declaration Refactor

- Now components CTX is declared as `propertyName` instead of `ctx.propertyName`.

---

## 1.3.2 (Feb 20, 2026)

### Inner HTML Rendering

- Components now render inner HTML declared as children, replacing each `<SLOT>` element with the actual child markup.
