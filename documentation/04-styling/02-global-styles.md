---
title: Global styles
description: Persistent styling throughout your page
---

Global styles are applied site-wide. Include them in your HTML `<head>` using a `<link>`:

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

### Interaction with Scoped Styles

Scoped styles can override global styles for the elements inside a component, but you can also reference global CSS if needed.
