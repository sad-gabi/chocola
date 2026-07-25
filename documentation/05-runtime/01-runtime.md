---
title: Runtime
description: Component runtime logic, self, and ctx
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

### Example with `self` and `ctx`

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

## Best Practices

- Always manipulate elements inside `self` to prevent conflicts when multiple instances of a component are rendered.
- Use `$runtime` to store state that persists across renders.
- Avoid manipulating the global `document` directly inside component scripts.
