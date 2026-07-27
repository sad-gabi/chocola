---
title: Building components
description: Creating new components during runtime
---

Chocola components can be created dynamically in the browser using the `ChocolaComponent` class.
You will rarely use this method since all your components in source code are already compiled in the final build.

## Creating a component

Extend `ChocolaComponent` with a template, CSS hash, runtime function, and default props:

```js
class Counter extends ChocolaComponent {
  constructor() {
    super({
      template: `
        <div>
          <button bind:self="btn">Clicked {count} times</button>
        </div>
      `,
      hash: "xqkfybnh",
      props: { count: 0 },
      runtime(self, ctx) {
        ctx.btn.addEventListener("click", () => {
          ctx.count++;
          ctx.btn.textContent = "Clicked " + ctx.count + " times";
        });
      }
    });
  }
}
```

## Usage

Use your created components the same way you would use the compiled ones.

## Full example

```js
class Greeting extends ChocolaComponent {
  constructor() {
    super({
      template: `
        <div class="greeting">
          <h1>Hello, {name}!</h1>
          <p bind:self="desc">{role}</p>
        </div>
      `,
      hash: "abc12345",
      props: { name: "World", role: "user" },
      runtime(self, ctx) {
        console.log("Greeting mounted:", ctx.name);
      }
    });
  }
}

const greeting = new Greeting();
greeting.mount(document.body, { name: "Alice", role: "admin" });

setTimeout(() => {
  greeting.update({ name: "Bob", role: "moderator" });
}, 3000);
```
