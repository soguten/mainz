---
title: SSR Runtime Flow
summary: Understand what Mainz uses in dev, build, preview, and runtime when a page declares `@RenderMode("ssr")`.
---

## SSR is page-owned

Mainz treats SSR as a page decision.

```tsx title="Product.page.tsx"
@Route("/products/:slug")
@RenderMode("ssr")
export class ProductPage extends Page {
  override render() {
    return <ProductDetails />;
  }
}
```

That route now means:

- HTML is produced at request time
- the page runs in a server/runtime environment
- browser assets can still hydrate afterward

This does **not** turn the whole app into an SSR app. One target can still mix:

- `csr` routes
- `ssg` routes
- `ssr` routes

## The output model

Mainz does not split builds into one top-level folder per render mode.

Instead, a target build is split by execution environment:

- `browser/` contains client-facing assets
- `server/` contains runtime-facing SSR artifacts when the target includes SSR
  routes

At a high level:

- `csr` contributes browser assets
- `ssg` contributes browser assets plus static HTML
- `ssr` contributes browser assets plus server artifacts

## What happens in `mainz dev`

Development still runs through the Vite dev server.

Mainz installs a Vite middleware plugin that intercepts document requests and
decides how each route should behave:

- `csr` routes fall through to the browser shell
- `ssg` routes are rendered on demand in dev so the HTML feels closer to final
  build output
- `ssr` routes are rendered at request time as true SSR routes

So yes, the dev strategy for SSG and SSR is similar in the sense that both can
render HTML on demand during development.

The difference is semantic:

- dev-time SSG rendering is an approximation of build output
- dev-time SSR rendering is the real route contract for that page

Vite is important here because Mainz uses dev-server features like HTML
transforms and dev module loading.

## What happens in `mainz build`

Build still uses Vite, but as a build tool, not as a runtime server.

Mainz runs:

1. a browser build for client assets
2. a server build when the target contains SSR routes
3. static HTML emission for SSG routes

That produces a target output shaped like this:

```text
dist/<target>/
  browser/
    index.html
    assets/...
    routes.json
    hydration.json
  server/
    app.mjs
    ssr-manifest.json
```

If a target has no SSR routes, the target remains `browser-only`.

If a target has at least one SSR route, the target becomes `server-capable`.

## What happens in `preview`

`mainz preview` does **not** depend on the Vite dev server.

Preview serves built artifacts.

For HTML requests, Mainz:

1. checks whether the target has built SSR artifacts
2. reads the SSR manifest
3. matches the request to an SSR route when possible
4. loads the built server entry
5. renders HTML from built artifacts

If the request is not an SSR document request, preview falls back to serving
static files from `browser/`.

That means preview is already exercising the built SSR output, not the dev
pipeline.

## What happens in runtime or production hosting

The production story follows the same built-artifact model as preview.

Mainz exposes a generic built-artifact request handler and host adapters can
serve it in a real server environment.

Today Mainz includes production adapters for:

- Deno
- Node

The core contract stays host-agnostic:

- request comes in
- Mainz matches the route against built metadata
- Mainz loads the built server entry
- Mainz renders HTML
- Mainz returns a `Response`

So Vite is **not** part of request-time production serving.

Vite is used to create the artifacts. Mainz runtime code serves those artifacts
later.

## Shared render core

Mainz now shares the same core rendering primitives across:

- dev-time SSG rendering
- dev-time SSR rendering
- build-time SSG document generation
- built SSR artifact serving

That shared core is why SSG, SSR, and preview now agree much more closely on:

- route matching
- route snapshot generation
- HTML assembly
- head application
- hydration bootstrap

## A practical mental model

- `dev` uses Vite as a development server
- `build` uses Vite as a bundler
- `preview` uses built Mainz artifacts, not Vite middleware
- production hosting uses built Mainz artifacts, not Vite middleware
- Deno and Node can both host the built `server/` artifacts today

If you want the page-level semantics behind `csr`, `ssg`, and `ssr`, see
[Render Mode and Render Strategy](./render-mode-and-strategy.md).
