---
title: Scoped styles
description: Encapsulated styles for your components
---

Chocola components support scoped styles — CSS included in a component only affects elements inside that component. Chocola adds a unique hash/class to each component's elements so the styles don't leak outside.

### Usage

1. Create your CSS file:

```css
/* file: my-style.css */
button {
  color: white;
}
```

2. Import it in your component:

```js
// file: MyComponent.js
import body from "path/to/body.html";
import styles from "./my-style.css";

export default function Button() {
  return {
    body,
    styles
  }
}
```

To apply styles to your root element, use `:root` as a placeholder selector:

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