![Chochola • The sweetest way to build the web](https://chocolaframework.web.app/static/img/banner.jpg)

## What is Chocola

Chocola is a new and sweeter way to build your web apps.

No bundler config. No virtual DOM. No hydration ceremony. Just `.html` files with `<template>`, `<script>`, and `<style>` — compiled to static HTML with scoped CSS, and optional runtime when you need it.

Import components. Instantiate them. Mount, update, remove. All client-side. Same file, zero overhead.

```html
<script>
    let self = new HTMLDivElement;
    let input = new HTMLInputElement;

    export let title = "Hello";

    function $runtime() {
        input.focus();
    }
</script>

<template>
    <div>
        <h1>{title}</h1>
        <input bind:self="input" type="text" placeholder="Your name">
    </div>
</template>

<style>
    h1 { color: chocolate; }
</style>
```

Chocola 2 is in current development and will add CSR SPA and much more features!

## Documentation

https://github.com/chocolajs/chocola/wiki/Overview
