---
title: Overview
---

Chocola is a web framework designed for simplicity and modularity. It lets you build components by compiling JS modules into HTML templates, CSS, and JS logic, keeping your projects clean and optimized.

```js
// file: Counter.js
import body from "./html/counter.html";
import styles from "./css/counter.css";

function RUNTIME(self, ctx) {
  self.querySelector("button").addEventListener("click", () => {
    ctx.count++;
  })
}

export default function Counter() {
  return {
    body,
    styles,
    script: RUNTIME
  }
}
```

Chocola handles the compilation for you, outputting a fully functional web app with vanilla JavaScript—no extra libraries needed.

Next, you’ll learn how to set up a Chocola project and start baking your own sweet web apps.