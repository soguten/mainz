# mainz

A class-based TSX runtime built on Web Components

## Build and Routing

This repository supports multi-target builds driven by `mainz.config.ts`, with:

- page-owned render selection through `@RenderMode(...)`
- target-level navigation policy (`spa`, `mpa`, `enhanced-mpa`)
- target selection (`site`, `playground`, or `all`)
- i18n-aware prerendered outputs where pages opt into `ssg`
- undecorated pages defaulting to `csr`
- page-first routing for `site` and app-only browser-first fallback for `playground`
- hydration-safe custom elements in prerendered pages

Quick commands:

- `deno task build:mainz`
- `deno task build:site`
- `deno task build:playground`
- `deno task preview:site:production`
- `deno task preview:playground`
- `deno task test:fast`
- `deno task test:e2e:core`
- `deno task test:smoke`
- `deno task test`

`preview:site:artifact` now uses a Mainz static preview server that serves the generated `404.html` for missing routes, so custom 404 title and meta tags are preserved during local preview.

For related framework docs and examples, see:

- [`docs/getting-started/installation.md`](./docs/getting-started/installation.md)
- [`docs/concepts/core/routing.md`](./docs/concepts/core/routing.md)
- [`examples/authorize-site`](./examples/authorize-site)
- [`examples/di-http-site`](./examples/di-http-site)
- [`docs/concepts/testing/overview.md`](./docs/concepts/testing/overview.md)
- [`docs/advanced/testing-matrix.md`](./docs/advanced/testing-matrix.md)
