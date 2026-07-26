---
title: Component fundamentals
description: Anatomy of a Chocola component — body, styles, and script
---

In Chocola, everything you build is a component. A component is a combination of HTML, CSS, and JavaScript logic that gets compiled and rendered into your app automatically. Components make your app modular, reusable, and easier to maintain.

A component is a single `.html` file with up to three sections:

- `<template>` — the HTML markup.
- `<style>` — scoped CSS (optional).
- `<script>` — runtime logic and prop declarations (optional).

```html
<!-- file: MyComponent.html -->
<script>
    let self = new HTMLElement;

    export let title = "Default";
    export let count = 0;

    function $runtime() {
        // runs once when the component is mounted
    }
</script>

<template>
    <h1>{title}</h1>
    <p>Count: {count}</p>
</template>

<style>
    h1 { color: chocolate; }
</style>
```

Only `<template>` is required — `<script>` and `<style>` are optional.

## `<template>` — HTML Markup

The template contains the component's HTML. It supports bindings via `{expr}`, conditionals (`if`, `del:if`, `elif`, `else`), `<slot>` for content projection, `<void>` as a transparent wrapper, and `bind:*` for DOM element references.

```html
<template>
    <h1>{title}</h1>
    <div if={isVisible}>Conditional content</div>
    <slot></slot>
</template>
```

Bindings are one-time substitutions, baked at compile-time. Reactive bindings are coming in a future version.

## `<style>` — Scoped CSS

CSS placed inside `<style>` is automatically scoped to the component — it won't leak out and affect other components.

```html
<style>
    button {
        color: chocolate;
    }
</style>
```

Use `:root` as a placeholder for the component's root element:

```html
<style>
    :root {
        color: red;
    }
</style>
```

## `<script>` — Props and Runtime

The `<script>` section has three roles:

### 1. Prop declarations with `export let`

Declare component props with optional default values:

```html
<script>
    export let display = true;
    export let title;
    export let count = 0;
</script>
```

Props without a default value (like `title` above) default to `undefined` unless provided by the parent.

### 2. Root element placeholder

```js
let self = new HTMLElement;
```

This is a DX placeholder for IDE autocompletion. At compile-time, `self` is replaced with the component's actual root DOM element.

### 3. Runtime function

```js
function $runtime() {
    // component logic
}
```

`$runtime` runs once after the component is rendered. It receives `self` (the root element) and `ctx` (props and state) as injected parameters — you don't declare them in the signature.

You can also declare helper functions at the top level of `<script>` and call them from `$runtime`. They are scoped to the component and won't leak.

```html
<script>
    export let label = "Click me";
    export let count = 0;

    function $runtime() {
        const btn = self.querySelector("button");
        btn.addEventListener("click", () => {
            count++;
        });
    }
</script>
```