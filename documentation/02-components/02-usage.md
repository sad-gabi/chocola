---
title: Using components
description: How to use Chocola components in HTML templates
---

Once you have created your Chocola components, you can use them directly in HTML.

## Component Tag Names

- Use the filename of your component (without `.html`) as the HTML tag.
- Component names use PascalCase (e.g., `Counter`, `UserProfile`, `TodoItem`).

## Passing Props

Props are custom attributes you can pass to a component. They map to `export let` declarations in the component's `<script>`.

```html
<Counter start="{5}" label="Clicks"></Counter>
```

- Here, `start` and `label` are props.
- String values are passed as-is.
- Expressions, numbers, booleans, and other dynamic values must be wrapped in `{ }` to be evaluated.

## Accessing Props in the Component

Props are available inside `$runtime`:

```html
<script>
    export let label = "Counter";
    export let start = 0;

    function $runtime() {
        let count = start;
        const button = self.querySelector("button");

        button.addEventListener("click", () => {
            count++;
        });
    }
</script>
```

If a prop is not provided by the parent, its default value is used.

## Example

```html
<!-- file: index.html -->
<app>
    <Counter title="Increment Count" start="{5}" label="Clicks"></Counter>
</app>
```

After Chocola compiles the app, the `<Counter>` tag is replaced with the component's rendered output.
