# chocola

Chocola is a JavaScript library for creating web user interfaces.

`chocola` only contains the functionality to build and serve web static builds. For production you may want to implement `chocola` to your workflow with other frameworks until official workflows are provided.
a
## Usage

```html
<!-- Greeting.html -->
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

## Documentation

See https://github.com/sad-gabi/chocola/wiki
