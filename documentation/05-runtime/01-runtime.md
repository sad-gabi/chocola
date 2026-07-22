---
title: Runtime
description: Component runtime logic, self, and ctx
---

## Script Runtime

Components can export a `script` function that runs once the component is rendered. This is where you add interactivity or logic tied to the component.

```js
// file: MyButton.js
import body from "path/to/my-button.html";

function RUNTIME() {
  console.log("Component rendered");
}

export default function Button() {
  return {
    body,
    script: RUNTIME
  }
}
```

## Context

The script function receives context to safely access component data and DOM elements:

- `self` — the root DOM element of the component.
- `ctx` — contains props and other dynamic values passed to the component. You can also define default values.

### Example with `self` and `ctx`

```js
// file: Counter.js
import body from "./html/counter.html";

function RUNTIME(self, ctx = { count: 0 }) {
  const numDisplay = self.querySelector("#number");

  self.addEventListener("click", () => {
    if (numDisplay) {
      numDisplay.textContent = parseInt(numDisplay.textContent) + 1;
    }
  });
}

export default function Button() {
  return {
    body,
    script: RUNTIME
  }
}
```

## Best Practices

- Always manipulate elements inside `self` to prevent conflicts when multiple instances of a component are rendered.
- Use `ctx` to pass dynamic data or props from the parent component or HTML attributes.
- Avoid manipulating the global `document` directly inside component scripts.
