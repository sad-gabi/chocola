# chocola

Chocola is a JavaScript library for creating web user interfaces.

`chocola` only contains the functionality to build and serve web static builds. For production you may want to implement `chocola` to your workflow with other frameworks as Vite until official workflows are provided.

## Usage

```html
<!-- MyTitle.html -->
<script>
    let self = new HTMLElement;

    export let title = "Default title";

    function $runtime() {
        console.log("Component mounted:", self)
    }
</script>

<template>
    <h1>{title}</h1>
</template>

<style>
    button { color: chocolate; }
</style>
```

## Documentation

See https://github.com/sad-gabi/chocola/wiki
