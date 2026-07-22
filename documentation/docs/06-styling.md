---
title: Styling
---


## Scoped Styles

Chocola components support scoped styles, meaning the CSS included in a component only affects elements inside that component.

### Implementation

Chocola adds a unique hash/class to each component’s elements, so the styles don’t leak outside.

### Usage:

1. Create your CSS file:
```css
/* file: my-style.css */

button {
  color: white;
}
```

2. Import it in your component:
```js
// file: my-component.js
import body from "path/to/body.html";
import styles from "./my-style.css";

export default function Button() {
  return {
    body,
    styles
  }
}
```


If you want to apply styles to your root element, you must use `:root` as a placeholder selector.

```css
/* file: my-style.css */
:root {
  color: red;
}

:root:hover {
  color: blue;
}
```

> Scoped styles automatically take priority over global styles inside the component.

## Global Styles

* Global styles are applied site-wide.
* Include them in your HTML `<head>` using a `<link>`:

```html
<!-- file: index.html -->
<html>
  <head>
    <link rel="stylesheet" href="path/to/styles.css">
  </head>

  <body>
    <app></app>
  </body>
</html>
```

### Interaction
With scoped styles: Scoped styles can override global styles for the elements inside a component, but you can also reference global CSS if needed.