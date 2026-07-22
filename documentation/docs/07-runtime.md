---
title: Runtime
---

## `script` Runtime

Components can export a `script` function, which runs once the component is rendered.

This is where you add interactivity or logic tied to the component.

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
* `self` → the root DOM element of the component.
* `ctx` → contains props and other dynamic values passed to the component. You can also define default values.

### Example with `self` and `ctx`
```js
// file: Counter.js
import body from "./html/counter.html";

// default values for ctx can be provided
function RUNTIME(self, ctx = { log: "Hello World!", show: true }) {
  // safe way to manipulate the component's own DOM
  const numDisplay = self.querySelector("#number");

  self.addEventListener("click", () => {
    if (numDisplay) {
      numDisplay.textContent = parseInt(numDisplay.textContent) + 1;
    }

    // avoid manipulating the global document directly
    // i.e. const numDisplayGlobal = document.querySelector("#number");
  });
}

export default function Button() {
  return {
    body,
    script: RUNTIME
  }
}
```

## Notes

* Always manipulate elements inside `self` to prevent conflicts when multiple instances of a component are rendered.
* Use `ctx` to pass dynamic data or props from the parent component or HTML attributes.