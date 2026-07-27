---
title: $runtime
description: Component runtime logic
---

## Script Runtime

Components can have runtime logic that runs once the component is rendered. This is where you add interactivity or logic tied to the component.

```html
<script>
    function $runtime() {
        console.log("Component rendered");
    }
</script>
```

## Context

The runtime function receives access to component data and DOM elements through injected variables:

- `self` — the root DOM element of the component.
- `ctx` — contains props and other dynamic values.

> You don't declare `self` and `ctx` as parameters — they are injected automatically at compile-time.

### Example with `self`

```html
<script>
    let self = new HTMLElement;
    export let count = 0;

    function $runtime() {
        const numDisplay = self.querySelector("#number");

        self.addEventListener("click", () => {
            if (numDisplay) {
                numDisplay.textContent = parseInt(numDisplay.textContent) + 1;
            }
        });
    }
</script>

<template>
    <div id="number">{count}</div>
</template>
```

## Top-Level Functions

You can declare helper functions at the top level of `<script>` and call them from inside `$runtime`. They are scoped to the component's runtime function and won't leak to other components.

```html
<script>
    let self = new HTMLDivElement;

    function format(n) {
        return n.toFixed(2);
    }

    function $runtime() {
        const el = self.querySelector(".price");
        if (el) el.textContent = format(ctx.price);
    }
</script>
```

This keeps your runtime logic clean by extracting reusable logic into named functions.

## Best Practices

- Always manipulate elements inside `self` to prevent conflicts when multiple instances of a component are rendered.
- Use `$runtime` to store state that persists across renders.
- Avoid manipulating the global `document` directly inside component scripts.
