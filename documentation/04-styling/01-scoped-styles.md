---
title: Scoped styles
description: Encapsulated styles for your components
---

Chocola components support scoped styles — CSS included in a component only affects elements inside that component. Chocola adds a unique hash/class to each component's elements so the styles don't leak outside.

### Usage

Add a `<style>` tag to your component:

```html
<!-- file: MyComponent.html -->
<template>
    <button>Click me</button>
</template>

<style>
    button {
        color: white;
    }
</style>
```

The `button` rule above will only apply to `<button>` elements inside this component.

To apply styles to your root element, use `:root` as a placeholder selector:

```html
<style>
    :root {
        color: red;
    }

    :root:hover {
        color: blue;
    }
</style>
```

> Scoped styles automatically take priority over global styles inside the component.
