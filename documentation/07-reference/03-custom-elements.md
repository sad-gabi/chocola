---
title: Custom elements
description: Using native HTML custom elements with Chocola
---

You can use HTML custom elements just like in regular HTML.

### Best Practices

- Do not capitalize custom element names to avoid conflicts with Chocola components.
- Avoid colliding names with Chocola components.

```html
<div>This is a regular HTML element</div>

<MyComponent>This is a Chocola component</MyComponent>

<my-element>This is a custom HTML element</my-element>
```