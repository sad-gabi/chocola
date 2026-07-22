---
title: Basic markup
description: Attributes, props and bindings
---

## Element Attributes

Chocola supports standard HTML attributes plus custom ones. JavaScript expressions can be used in attributes by wrapping them with `{}`.

```html
<div class="box {myClass ?? 'my-class'}"></div>
```

> TIP: It's recommended to wrap expression bindings inside double quote marks (`""`) when used as attributes or props values to prevent JS syntax from breaking HTML parsing.

## Component Props

Props are values passed to a component's context (`ctx`). They do not appear as HTML attributes in the DOM.

```html
<MyComponent text="Some text" color="{myColor}" />
```

## Text Interpolation

You can insert JS expressions or props directly into HTML with `{}` bindings.

```html
<div>
  <h1>{title}</h1>
  <div>The time is {time ?? "00:00"}</div>
</div>
```

> TIP: To write literal curly braces (`{`, `}`), use their HTML entities, such as `&#123;` and `&#125;`.