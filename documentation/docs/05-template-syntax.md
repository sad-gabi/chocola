---
title: Template syntax
---

## Element Attributes

Chocola supports standard HTML attributes plus custom ones.
JavaScript expressions can be used in attributes by wrapping them with `{}`.

```html
<!-- file: my-component.html -->
<div class="box {myClass ?? 'my-class'}"></div>
```

> TIP: It's recommended to wrap expression bindings inside double quote marks (`""`) when used as attributes or props values to prevent JS syntax from breaking HTML parsing.

## Component Props

Props are values passed to a component's context (`ctx`).
* They do not appear as HTML attributes in the DOM.
* Use them to customize how the component renders.

```html
<MyComponent text="Some text" color="{myColor}" />
```

## Text Interpolation

You can insert JS expressions or props directly into HTML with `{}`.

```html
<div>
  <h1>{title}</h1>
  <div>The time is {time ?? "00:00"}</div>
</div>
```

> TIP: To write literal curly braces (`{`, `}`), you must use their code entities like `&#123;` and `&#125;` instead.

## Conditional Rendering

Chocola provides two primary mechanisms for conditional rendering, depending on whether you need to preserve the element in the DOM or remove it entirely.

### 1. Toggle vs. Removal

* `if={foo}`: Toggles visibility using `display: none`. The element remains in the DOM tree, preserving its state and layout footprint even when hidden.
* `del-if={foo}`: Completely removes the element from the DOM when the condition is false. Use this for performance optimization or when you don't want the element to be accessible via CSS/JS.

```html
<!-- Remains in DOM, hidden via CSS -->
<div if={isLoggedIn}>Welcome back!</div>

<!-- Removed from DOM if false -->
<div del-if={isLoggedIn}>Please log in to view content</div>
```

### 2. Logic Chains (`elif`, `else`)

You can chain multiple conditions by placing `elif` and `else` directives on siblings immediately following an `if` or `del-if` block.

```html
<div if="{user.role === 'admin'}">Admin Panel</div>
<div elif="{user.role === 'editor'}">Editor Dashboard</div>
<div else>View Only</div>
```

> Note: Inline expressions are fully supported, such as `<div if="{temperature > 30}">It's hot!</div>`.

### 3. Transparent Wrappers (`<void>`)

The `<void>` element acts as a functional wrapper that is never rendered in the final DOM. It is the ideal solution for applying logic to multiple children without introducing unnecessary wrapper nodes (like `<div>` or `<span>`).

```html
<!-- Renders only the children; <void> itself disappears -->
<void if={isLoaded}>
  <h1>Data Loaded</h1>
  <p>Here is your content.</p>
</void>
```

## Children Rendering (`<slot>`)

Components can render nested HTML via a `<slot>` placeholder:

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