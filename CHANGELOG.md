# Chocola Changelog

## 1.3.4 (Feb 20, 2026)

### CTX Handling

- Fixed the following CTX handling:
  - HTML templates still needed `{ctx.name}` format. Changed to `{name}`.
  - `if` and `del-if` were being evaluated with `name` variables instead of `ctx.name`. Now fixed.

### Removed `chocola/types`

- Removed `chocola/types` submodule. Will be replaced with TypeScript support.

### `if` Attribute Disposement

- Now the compiler removes the `if` attribute for static conditional rendering.

---

## 1.3.3 (Feb 20, 2026)

### CTX Declaration Refactor

- Now components CTX is declared as `propertyName` instead of `ctx.propertyName`.

---

## 1.3.2 (Feb 20, 2026)

### Inner HTML Rendering

- Components now render inner HTML declared as children, replacing each `<SLOT>` element with the actual child markup.
