---
title: Component fundamentals
description: Anatomy of a Chocola component — body, styles, and script
---

In Chocola, everything you build is a component. A component is a combination of HTML, CSS, and JavaScript logic that gets compiled and rendered into your app automatically. Components make your app modular, reusable, and easier to maintain.

Each component is just a JS module that exports three things:

1. `body` — the HTML template.
2. `styles` — the CSS for the component (optional).
3. `script` — the JS logic that runs for the component (optional).

```js
// file: MyComponent.js
import body from "path/to/body.html";
import styles from "path/to/styles.css";

function RUNTIME(self, ctx) {
  // isolated component logic
}

export default function MyComponent() {
  return {
    body,
    styles,
    script: RUNTIME
  }
}
```

- `RUNTIME` is the behavior for your component.
- `ctx` is an object to store state that persists across renders.
- `self` is the root DOM element of the component.

Once exported, Chocola automatically injects your component into the `<app>` element of your `index.html`. You can create as many components as you want, and each one stays isolated and reusable.

> TIP: Every component must have a `body`; `styles` and `script` are optional.

## HTML Templates

HTML templates are pieces of HTML that follow Chocola's syntax. They can contain bindings to insert content:

```html
<!-- my-component.html -->
<div>
  <button title={title}>{text}</button>
  <div class="main">
    <div class="number">{count}</div>
  </div>
</div>
```

As of now, Chocola only supports one-time substitution bindings, baked at compile-time. Reactive bindings will be added in V3.

## Scoped CSS

CSS imported into a component is scoped to that component:

```css
/* file: my-component.css */
button {
  /* this will only affect <button> elements in this component */
  color: chocolate;
}
```

> Chocola ensures that styles don't leak between components.

## JS RUNTIME

The `RUNTIME` function runs when the component is rendered. It receives:
- `self` — the root DOM element of the component.
- `ctx` — an object to store and update state.

```js
// file: Counter.js
function RUNTIME(self, ctx) {
  const button = self.querySelector("button");

  button.addEventListener("click", () => {
    ctx.count++;
    button.textContent = ctx.count;
  });
}
```

## New Components (V2)

Chocola 2 will replace the Modular Components with Single File Components (SFC), similar to most modern web frameworks. This is a preview of what a component will look like in the future:

```html
<!-- file: MyComponent.html -->
<script>
    import MyComponent from "path/to/MyComponent.html";
    import MyStyle from "path/to/my-style.css";

    function $props() {
        return {
            display: Boolean,
            title: String || "My Title",
            label: "My Label"
        }
    }

    export let { remove, display, title, label } = $props();

    const self = new HTMLElement;
    let contents = "Hello";
    let bgColor = "white";

    function $runtime() {
        // ...
    }
</script>

<void>
    <!-- Component body -->
</void>

<style>
    /* Encapsulated styles */
</style>
```
