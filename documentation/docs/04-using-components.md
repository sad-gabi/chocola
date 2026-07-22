---
title: Using components
---

Once you have created your Chocola components, you can use them directly in HTML.

## Component Tag Names

* Use the file name of your component (without the `.js` extension) as the HTML tag.
* Component names use PascalCase (e.g., `Counter`, `UserProfile`, `TodoItem`).

## Passing Props
Props are custom attributes you can pass to a component to provide values to render.

```html
<Counter start="{5}" label="Clicks"></Counter>
```

* Here, `start` and `label` are props.
* Props are passed as strings by default. Special props like numbers, booleans, or expressions must be wrapped in `{}` to be converted automatically by Chocola, or you can convert them manually inside the component.

## Accessing Props in the Component
Props are available in the component context (`ctx`) during runtime. For example:

```js
function RUNTIME(self, ctx) {
  // ctx.start is 5 (converted to number)
  ctx.count = ctx.start || 0;

  const button = self.querySelector("button");
  button.textContent = ctx.label || "Counter";

  button.addEventListener("click", () => {
    ctx.count++;
  });
}
```

> Note: `ctx` stores both props and component state.

## Example Rendering
```html
<!-- file: index.html -->
<app>
  <Counter title="Increment Count" start="{5}" label="Clicks"></Counter>
</app>
```

After Chocola compiles the app:

```html
<!-- file: dist/index.html -->
<app>
  <div>
    <button title="Increment Count">Clicks</button>
    <div class="main">
      <div class="number">5</div>
    </div>
  </div>
</app>
```

* The component renders with the provided prop values.