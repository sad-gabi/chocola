---
title: Misc
---

## Testing

To test your Chocola app with hot-reload, run:
```sh
node chocola.server.js
```

This will start a local server and automatically reload the app whenever you make changes.

## Custom Elements

You can use HTML custom elements just like in regular HTML.

### Best practices 
* Do not capitalize custom element names to avoid conflicts with Chocola components.
* Avoid colliding names with Chocola components.

```html
<div>This is a regular HTML element</div>

<MyComponent>This is a Chocola component</MyComponent>

<my-element>This is a custom HTML element</my-element>
```

# FAQ

## Getting Started

### What exactly is Chocola?

Chocola is a small web framework that lets you build apps out of reusable components — little self-contained pieces of HTML, CSS, and JavaScript that you snap together. When you're ready to ship, Chocola compiles everything into plain vanilla JavaScript. No framework baggage, no runtime to download, just clean code in the browser.

### How do I get a project up and running?

Install Chocola with `npm install chocola`, then create three things: a `chocola.config.json` (tells Chocola where your files live), an `index.js` (runs the build), and a `chocola.server.js` (starts the dev server). Your HTML entry point lives at `src/index.html`.

Once that's in place, `node chocola.server.js` gets you a live-reloading browser preview.

For more info, see the **[Getting Started](https://github.com/sad-gabi/chocola/wiki/1.-Getting-Started)** docs page.

### Why does my HTML need an `<app>` tag?

The `<app>` element is the landing zone where Chocola drops all your compiled components. Think of it as the stage — Chocola won't know where to put anything without it. Everything outside `<app>` (like your <head> or a nav bar) is left completely alone.

The elements outside `<app>` can be a persistent static layout if you want it to be!


## Components

### What does a component actually look like?

A component is just a JavaScript file that exports a function returning an object with up to three keys: `body` (your HTML), `styles` (your CSS), and `script` (your logic). Only `body` is required — the other two are optional.

```js
// file: Card.js
import body from "./html/card.html";
import styles from "./css/card.css";

export default function Card() {
  return { body, styles };
}
```

### How do I actually use a component on a page?

Use the component's filename as an HTML tag, written in PascalCase. So a file called `UserCard.js` becomes `<UserCard></UserCard>` in your HTML. Chocola replaces that tag with the component's rendered output at compile time.

> Component names must be PascalCase (first letter capitalized).

### Can a component render content passed into it from the outside?

Yes — put a `<slot>` element in your component's HTML template. Whatever you write between the component's opening and closing tags in the parent gets rendered in that spot.

```html
<!-- component template -->
<div class="card">
  <slot></slot>
</div>

<!-- usage -->
<Card>
  <p>Hello from the parent</p>
 </Card>
```


## Props & Data

### How do I send data into a component?

Add attributes to the component tag — those become props. Strings go in plain, everything else (numbers, booleans, variables) gets wrapped in curly braces, so Chocola evaluates them properly:

```html
<Counter label="Clicks" start={5} active={true}></Counter>
```

Inside the component's `script`, you get to those values through the `ctx` object: `ctx.label`, `ctx.start`, and so on.

### How do state and reactivity work?

Reactivity and state will be added in Chocola 3. As of now, manually update contents via components' `RUNTIME()` function and global scripts.


## Templates & Logic

### How do I show or hide something based on a condition?

Two options, depending on what you need. The `if` attribute hides the element visually (keeps it in the DOM with `display: none`). The `del-if` attribute removes it from the DOM entirely. Use `del-if` when the element really shouldn't be there, and `if` when you might want to toggle it back quickly.

```html
<div if={isVisible}>Hidden but still in the DOM</div>
<div del-if={shouldRemove}>Gone completely</div>
```

### Can I use JavaScript expressions directly in my HTML?

Yes, you can. It looks something like this:

```html
<h1>{title ?? "Untitled"}</h1>
<div class="box {isActive ? 'active' : ''}"></div>
<p if={temperature > 30}>It's hot outside!</p>
```


## Styling

### Will my component's CSS bleed into the rest of the page?

No. CSS you import into a component is automatically scoped to that component — Chocola adds a unique hash to the component's elements under the hood. So a `button { color: red }` rule in one component won't affect buttons anywhere else. You don't need to do anything special for this to work.

### What if I want styles that apply to the whole site?

Link a stylesheet the normal way in your `src/index.html` `<head>`. Those styles will apply globally. When a component has a scoped rule that conflicts with a global one, the scoped style prevails inside that component.

## The Script / Runtime

### When does my component's script run?

Once, right after the component has been rendered into the DOM. It's the right place to attach event listeners, kick off fetches, set up timers, or anything else that needs the HTML to be there already.

### What are `self` and `ctx`, and why do they matter?

`self` is the root DOM node of your component instance. Always use `self.querySelector()` instead of `document.querySelector()` — if you have two copies of the same component on a page, `document.querySelector` would grab from both at once, causing weird bugs. `self` keeps everything neatly contained.

`ctx` is where your props and state live. You can read props from it, write new state to it, and set default values by giving the parameter a default: `function RUNTIME(self, ctx = { count: 0 })`.


## Miscellaneous

### Can I use regular HTML custom elements like `<my-widget>`?

Yes. Chocola only intercepts PascalCase tags — anything lowercase is treated as a normal HTML element. So `<my-widget>` is safe to use as a native custom element. Just don't name it the same as one of your component files, and don't capitalize it.

### Is there a way to see changes without rebuilding manually every time?

That's exactly what `node chocola.server.js` is for. It runs a local dev server with hot-reload baked in — save a file and the browser refreshes automatically. You only need to think about doing a manual build when you're getting ready to deploy.