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

Chocola only intercepts PascalCase tags — anything lowercase is treated as a normal HTML element. So `<my-widget>` is safe to use as a native custom element. Just don't name it the same as one of your component files, and don't capitalize it.
