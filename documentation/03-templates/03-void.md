---
title: <void>
description: Using transparent wrappers
---

The `<void>` element acts as a functional wrapper that is never rendered in the final DOM. It applies logic to multiple children without introducing unnecessary wrapper nodes.

```html
<!-- Renders only the children; <void> itself disappears -->
<void if={isLoaded}>
  <h1>Data Loaded</h1>
  <p>Here is your content.</p>
</void>
```