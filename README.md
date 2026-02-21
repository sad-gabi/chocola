# chocola

Chocola is a JavaScript library for creating web user interfaces.

`chocola` only contains the functionality to build and serve web static builds. For production you may want to implement `chocola` to your workflow with other frameworks as Vite until official workflows are provided.

## Usage

```html
<!-- counter.html -->
<div>
  <button title={title}>{text}</button>

  <div class="main">
    <div class="number">${count}</div>
  </div>
</div>
```

```js
import HTML from "./html/counter.html";
import CSS from "./css/counter.css";

function RUNTIME(self, ctx) {
  self.querySelector("button").addEventListener("click", () => {
    ctx.count++;
  })
}

export default function Counter() {
  return {
    body: HTML,
    styles: CSS,
    script: RUNTIME
  }
}
```

## Documentation

See https://github.com/sad-gabi/chocola/wiki
