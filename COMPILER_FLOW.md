# Compiler Flow

## Entry Point

**`index.js`** — the public API. Exports `app.build(rootDir, srcDir)` which delegates to `compiler/index.js`.

## Compilation Pipeline

### 1. Configuration (`compiler/config.js`)

`loadConfig(rootDir)` reads `chocola.config.json` (via `utils.js`) and merges with defaults:

| Key | Default | Description |
|---|---|---|
| `srcDir` | `"src"` | Source directory |
| `outDir` | `"dist"` | Output directory |
| `libDir` | `"lib"` | Components directory (inside `srcDir`) |
| `emptyOutDir` | `true` | Whether to clean output before build |

`resolvePaths()` resolves absolute paths for `outDir`, `src`, and `components`.

### 2. Setup (`compiler/index.js`)

- Clears output directory if `emptyOutDir` is enabled
- Loads the source index file (`index.html` or `.choco` from `srcDir`)
- Discovers and loads all components from `src/lib/`

### 3. Component Discovery (`compiler/pipeline.js`)

`getComponents(libDir)`:
- Reads all `.js` files in the components directory
- Only processes files starting with an uppercase letter (e.g., `Button.js`)
- Imports each module (inlining `.html`/`.css` imports via `loadWithAssets`)
- Calls the default export function to get the component instance
- Stores `__sourceFile` on each instance for error reporting
- Returns a `Map<lowercase-filename, instance>`

### 4. DOM Processing (`compiler/dom-processor.js`)

- Creates a JSDOM instance from the index file
- Validates an `<app>` root element exists
- Extracts all child elements inside `<app>` for component processing
- Extracts `<link>` elements (stylesheets, icons) for asset processing

### 5. Component Processing (`compiler/component-processor.js`)

For each element inside `<app>`:

1. **Match** — checks if tag name corresponds to a loaded component
2. **Context** — extracts attributes as context (`ctx.*`)
3. **Chain validation** — validates `if`/`elif`/`else`/`del-if` structure on both slot content and component body separately **before** slot replacement, throwing with `file:line` on violation
4. **Template** — renders component body via JSDOM fragment
5. **Slots** — replaces `<slot>` elements with the original inner HTML
6. **Attribute interpolation** — evaluates `{expr}` in attributes using `with(ctx)`
7. **Conditionals** — evaluates `if`, `del-if`, `elif`, `else` attributes:
   - `if={expr}` — hides element (display:none) when falsy
   - `del-if={expr}` — removes element when falsy
   - `elif={expr}` — alternative condition in a chain
   - `else` — fallback in a chain
   - Chained via `condChain` state tracked per-parent in a `Map`
   - `else` closes the chain; non-conditional elements reset it
   - `elif`/`else` without a preceding `if`/`del-if` throws an error
8. **Void elements** — `<void>` is a transparent conditional wrapper:
   - `<void if={expr}>` — renders children unwrapped when truthy
   - `<void elif={expr}>` — chain-aware alternative
   - `<void else>` — chain-aware fallback
   - `<void>` — always renders children unwrapped (fragment-like)
9. **Runtime ID** — if the component has `script` or `effects`, assigns a unique `chid` attribute
10. **CSS Scoping** — if the component has `styles`, generates a scoped CSS class and rewrites selectors:
    - Simple selectors (`.foo`) generate both AND-scoped (`.cssId.foo`) and descendant-scoped (`.cssId .foo`) variants
    - Selectors with combinators use descendant scoping only
    - `:root` and `:root.class` scope to the root element only
11. **Runtime Chunk** — generates a runtime function call: `aRUNTIME(el, ctx)`
12. **Recursion** — processes nested components within the current component (with cycle detection via `renderChain`)

### 6. Runtime Generation (`compiler/runtime-generator.js`)

Wraps all runtime chunks in `DOMContentLoaded` and writes to `run-<random>.js`.

### 7. Asset Processing (`compiler/dom-processor.js` + `compiler/pipeline.js`)

- **Stylesheets** — copies local CSS files to output with random filenames, updates `<link>` hrefs
- **Icons** — copies icon files to output
- **Scoped CSS** — writes component-scoped CSS to `sc-<random>.css`, appends `<link>` to document head
- **Resources** — scans output HTML and CSS for local file references (`src`, `href`, `url()`), copies them to output preserving directory structure

### 8. Output (`compiler/dom-processor.js`)

- Appends runtime `<script>` tag to document body
- Serializes and beautifies the final HTML
- Writes `index.html` to output directory
- Writes generated CSS and JS files alongside it

## Data Flow Diagram

```
index.js
  └─ compiler/index.js
       ├─ config.js          → loadConfig + resolvePaths
       ├─ pipeline.js        → getComponents, getSrcIndex, processStylesheet, processIcons, copyResources
       ├─ dom-processor.js   → createDOM, validateAppContainer, getAppElements, serializeDOM, writeHTMLOutput, appendRuntimeScript
       ├─ component-processor.js → validateChainStructure, processAllComponents, processComponentElement, scopeCss
       └─ runtime-generator.js → generateRuntimeScript
```

## Key Concepts

- **Components**: ES modules with default export returning `{ body, script, styles, effects }`
- **Asset inlining**: `.html`/`.css` imports in components are inlined at build time via `loadWithAssets`
- **CSS Scoping**: Component styles are scoped by rewriting selectors under a unique CSS class ID. Both root and descendant matching via dual selectors (AND + descendant).
- **Runtime scripts**: Components with dynamic behavior get a unique ID and a runtime call that re-attaches event listeners / effects on page load
- **Conditional chains**: `if`/`del-if`/`elif`/`else` form sibling chains tracked per-parent; validated structurally before rendering with file:line error reporting
- **Void elements**: `<void>` acts as a transparent wrapper that never renders itself; useful for conditional rendering without extra DOM nodes
