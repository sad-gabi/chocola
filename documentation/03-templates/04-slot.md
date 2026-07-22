---
title: <slot>
description: Rendering passed children inside an element
---

Components can render nested HTML and components via a `<slot>` placeholder.

### Template

```html
<div class="container">
    <slot></slot>
</div>
```

### Usage

```html
<Container>
    <div>This will be rendered instead of slot</div>
</Container>
```
