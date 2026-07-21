# Roadmap

Chocola ships one version at a time. Nothing on this list starts until the layer beneath it is solid.

## V1 — Foundations
**Status: Available**

The core compiler and the minimum needed to build a real page with it.

- Single-page SSG
- Basic logic blocks (`if` / `elif` / `else`, `<void>`)
- Components (factory + instance model, scoped styles and scripts)

## V2 — Consolidation
**Status: In progress**

Hardening what V1 introduced and giving components a proper file format.

- SSG with static routes
- Declarative imports for components
- New SFC (single-file component) format
- More logic blocks (`for:each`, `switch/case`)
- Typed properties

## V3 — Reactivity
**Status: Planned**

The state layer: `ctx`, typed properties, and everything that depends on them staying live in the browser.

- Reactive components and state
- Client-side static SPA
- Fine-tuning optimization features

## V4 — Shipping
**Status: Planned**

Taking Chocola past static output.

- Server-side SPA and more features to plan

---

Have thoughts on sequencing or want to propose something for a later version? Open an issue.