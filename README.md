# mainz

A class-based TSX runtime built on Web Components

## Build and Routing (CSR + SSG)

This repository supports multi-target builds driven by `mainz.config.ts`, with:

- `csr` and `ssg` modes
- target-level navigation policy (`spa`, `mpa`, `enhanced-mpa`)
- target selection (`site`, `playground`, or `all`)
- i18n-aware SSG outputs
- page-first routing for `site` and app-only CSR fallback for `playground`
- hydration-safe custom elements in prerendered pages

Quick commands:

- `deno task build:mainz`
- `deno task build:site:csr`
- `deno task build:site:ssg`
- `deno task build:playground:csr`
- `deno task preview:site:csr`
- `deno task preview:site:ssg`
- `deno task preview:playground:csr`
- `deno task test:fast`
- `deno task test:e2e:core`
- `deno task test:e2e:special`
- `deno task test:smoke`
- `deno task test`

`preview:site:ssg` now uses a Mainz static preview server that serves the generated `404.html` for
missing routes, so custom 404 title and meta tags are preserved during local preview.

For related framework docs and examples, see:

- [`docs/getting-started/installation.md`](./docs/getting-started/installation.md)
- [`docs/concepts/core/routing.md`](./docs/concepts/core/routing.md)
- [`examples/authorize-site`](./examples/authorize-site)
- [`docs/concepts/testing/overview.md`](./docs/concepts/testing/overview.md)
- [`docs/advanced/testing-matrix.md`](./docs/advanced/testing-matrix.md)
