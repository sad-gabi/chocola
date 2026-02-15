# 🍫 Chocola JS

> A Sweet Taste of Reactive Web Development

Chocola is a lightweight, reactive component-based web framework that brings simplicity and modularity to modern web development. Build dynamic components with reactivity, global state management, and a developer experience as sweet as chocolate.

## ✨ Features

- **🧩 Component-Based Architecture** - Build reusable, modular components with ease
- **⚡ Reactive Runtime** - Components automatically update when reactive variables change
- **🔄 Reactive Variables** - Mutable state with `&{sfx.var}` syntax and automatic re-rendering
- **🎯 Context System** - Pass data to components using intuitive `ctx.*` attributes
- **🌐 Global State Management** - Share state across components with `sfx` variables
- **📡 Variable Subscription** - Subscribe to state changes across your application
- **🎭 Conditional Rendering** - Show/hide components dynamically with `chif` attribute
- **🔌 Component Lifecycle API** - Public APIs for mounting, manipulating, and removing components
- **📦 Built-in Bundler** - Automatic compilation and optimization
- **🔥 Hot Reload Development** - See changes instantly with the dev server
- **🎨 Template Syntax** - Clean HTML templates with `{}` and `&{}` interpolation
- **⚙️ Zero Config** - Works out of the box with sensible defaults

## 🚀 Quick Start

### Installation

```bash
npm install chocola
```

### Project Structure

```
my-chocola-app/
├── src/
│   ├── lib/
│   │   ├── Counter.js
│   │   ├── TodoItem.js
│   │   └── html/
│   │       ├── counter.body.html
│   │       └── todoItem.body.html
│   ├── styles/
│   │   └── mainStyle.css
│   └── index.html
├── chocola.config.json
├── chocola.server.js
└── index.js
```

### Configuration

Create a `chocola.config.json` file:

```json
{
  "bundle": {
    "srcDir": "/src",
    "outDir": "/dist",
    "libDir": "/lib",
    "emptyOutDir": true
  },
  "dev": {
    "hostname": "localhost",
    "port": 3000
  }
}
```

## 📝 Creating Components

### 1. Define Your HTML Template

> NOTE: Reactivity, component APIs and global variables are not implemented yet.
> Any of this features displayed here are for future references and may be modified.

Create `src/lib/html/counter.body.html`:

```html
<div class="counter">
  <h2>{ctx.title}</h2>
  <!-- Use & instead of  to set reactivity -->
  <p>Count: &{sfx.count}</p>
  <button class="increment">+</button>
  <button class="decrement">-</button>
</div>
```

### 2. Create the Component Logic

Create `src/lib/Counter.js`:

```javascript
import { lib } from "chocola";
import HTML from "./html/counter.body.html";

function RUNTIME(self, ctx) {
  // Acces to component effects 
  let sfx = self.sfx;

  // Event handlers
  self.querySelector(".increment").addEventListener("click", () => {
    sfx.incrementCount(); // Automatically updates the UI
  });
  
  self.querySelector(".decrement").addEventListener("click", () => {
    sfx.decrementCount(); // Automatically updates the UI
  });
}

function EFFECTS(self, sfx) {
  // Component lifecycle effects
  sfx.onMount: () => {
      console.log("Counter mounted with count:", sfx.count);
  },
  sfx.onUpdate: () => {
    // Log updated variables
    console.log("Counter updated:", sfx.diff);
  },
  sfx.onRemove: () => {
    console.log("Counter removed");
  };

  // Create the component public API
  const api = lib.api(self, sfx);

  // Create methods to expose
  api.incrementCount = () => {
    sfx.count++
  }
  api.decrementCount = () => {
    sfx.count--
  }

  // Expose the component API
  return api
}

export default function Counter() {
  return {
    body: HTML,
    script: RUNTIME,
    effects: EFFECTS
  };
}
```

### 3. Use the Component

In your `src/index.html`:

```html
<html>
  <head>
    <title>Chocola Counter App</title>
  </head>
  <body>
    <app>
      <!-- Set mutable sfx variables with & -->
      <Counter ctx.title="My Counter" sfx.&initialCount="0"></Counter>
    </app>
  </body>
</html>
```

## 🎭 Component Anatomy

### Template (`body`)
- Standard HTML with template variables
- **Static context**: `{ctx.propertyName}`, `{sfx.propertyName}`  - rendered once at initialization
- **Reactive state**: `&{sfx.propertyName}` - automatically updates on change
- Clean separation of markup and logic

### Runtime (`script`) - Optional
- Function that receives `self` (component API, properties and DOM element), `ctx` (static context), and `sfx` (dynamic context)
- Initialize runtime script and event handlers
- Full access to DOM APIs and browser features
- Executes when the component mounts

### Effects (`effects`) - Optional
- Function that receives `self` and `sfx`
- Returns lifecycle hooks: `onMount`, `onUpdate`, `onRemove`
- Manage side effects and component lifecycle
- Clean up resources when component is removed

## ⚡ Reactivity System

### Mutable Reactive Variables

Use `&{sfx.varName}` in templates for automatic reactivity:

```html
<div>
  <p>Username: &{sfx.username}</p>
  <p>Online: &{sfx.isOnline}</p>
</div>
```

```javascript
function RUNTIME(self, ctx) {
  let sfx = self.sfx;
  
  // Changes automatically update the UI
  setTimeout(() => {
    sfx.username = "Alice";
    sfx.isOnline = true;
  }, 2000);
}
```

### Variable Subscription

Subscribe to changes in reactive variables across components:

```javascript
import { app } from "chocola";

function RUNTIME(self, ctx) {
    let sfx = self.sfx;

  // Subscribe to global state
  app.watch("globalCounter", (newValue) => {
    console.log("Global counter changed to:", newValue);
    sfx.localCount = newValue * 2;
  });
}
```

### Conditional Rendering

Use the `chif` attribute to conditionally render components:

```html
<app>
  <!-- Based on ctx variable (static) -->
  <LoginForm chif="ctx.isLoggedOut"></LoginForm>
  
  <!-- Based on sfx variable (reactive with &) -->
  <Dashboard chif="sfx.&isAuthenticated"></Dashboard>
  <LoadingSpinner chif="sfx.&isLoading"></LoadingSpinner>
</app>
```

```javascript
function RUNTIME(self, ctx) {
  let sfx = self.sfx;

  // Simulate authentication
  setTimeout(() => {
    sfx.isLoading = false;
    sfx.isAuthenticated = true;
    // Dashboard appears, LoadingSpinner disappears
  }, 2000);
}
```

## 🌐 Global State Management

Share state across your entire application:

```javascript
// In any component
import * as globals from "path/to/globals.js";

function RUNTIME(self, ctx, sfx) {
  // Set global variables
  globals.userTheme = "dark";
  globals.notifications = [];
  
  // Access global variables from other components
  console.log(globals.userTheme);
}
```

## 🔌 Component Public API

### Mounting Components Dynamically

```javascript
// In any component
import { lib } from "chocola";
import Counter from "./lib/Counter.js";

// Mount a component programmatically in RUNTIME and/or EFFECTS
function RUNTIME(self. ctx) {
 const counterInstance = lib.mount(Counter)
   .defCtx({
      title: "Dynamic Counter",
      initialCount: "10"
   })
   .render() // Render accepts a DOM element or component
             // instance as a target parameter; default
             // target is set as your <app> element
}
```

### Manipulating Components

```javascript
// Acces and modify variables
console.log(counterInstance.ctx.title);
counterInstance.sfx.count = 1;

// Call component API methods
counterInstance.reset();
console.log(counterInstance.getCount())
```

### Removing Components

```javascript
// Remove and clean up
counterInstance.remove();
```

## 🔧 Development

### Start Development Server

Create `chocola.server.js`:

```javascript
import { dev } from "chocola";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dev.server(__dirname, "src", "dist");
```

Run:
```bash
node chocola.server.js
```

Visit `http://localhost:3000` to see your app with hot reload enabled.

### Build for Production

Create `index.js`:

```javascript
import { app } from "chocola";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.build(__dirname);
```

Build:
```bash
node index.js
```

Your optimized app will be in the `dist/` directory.

---

## 🏗️ Build Output

Chocola automatically:
- ✅ Compiles components into optimized JavaScript
- ✅ Generates unique component IDs (`chid`)
- ✅ Bundles scripts with proper dependency resolution
- ✅ Processes templates and injects runtime code
- ✅ Sets up reactivity system for `&{sfx.*}` variables
- ✅ Optimizes conditional rendering with `chif` attributes
- ✅ Generates component API wrappers for mounting/unmounting
- ✅ Optimizes assets for production

## 🎯 Best Practices

### When to Use `ctx` vs `sfx`

- **Use `ctx`** for static configuration that won't change (titles, labels, initial values)
- **Use `sfx`** for dynamic data that updates over time and its configurations (counts, user input, API responses)

### Component Lifecycle

```javascript
function EFFECTS(self, sfx) {
  return {
    onMount: () => {
      // Initialize, fetch data, set up subscriptions
    },
    onUpdate: () => {
      // React to specific state changes
      // Only runs when sfx variables change
    },
    onRemove: () => {
      // Clean up timers, subscriptions, event listeners
    }
  };
}
```

### Conditional Rendering Performance

- Use `chif` with reactive variables for dynamic show/hide
- Use `chif` with static variables for static conditional rendering
- Components with `chif="false"` are not mounted at all (performance optimization)

## 🤝 Contributing

Contributions are welcome! Chocola is in active development and we'd love your input.

## 📄 License

MIT License - feel free to use Chocola in your projects!

## 🍫 Why Chocola?

- **Simple**: No complex build configurations or CLI tools to learn
- **Reactive**: Built-in reactivity without the complexity of larger frameworks
- **Fast**: Minimal runtime overhead with efficient reactive updates
- **Flexible**: Use as much or as little as you need
- **Modern**: Built with ES modules and modern JavaScript features
- **Powerful**: Global state, subscriptions, and lifecycle hooks out of the box
- **Sweet**: Developer experience that's actually enjoyable

---

Made with 🍫 and ❤️

**Start building sweet reactive web apps today!**