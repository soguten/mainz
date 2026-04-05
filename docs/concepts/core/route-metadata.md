---
title: Route Metadata
summary: Keep route patterns, params, and page ownership visible right on the class.
---

## Keep route intent on the page

`@Route(...)` keeps the URL contract next to the page that owns it.

That matters because routing in Mainz is not an external config file first. The page carries the
metadata, while the runtime and build pipeline consume it.

```tsx title="Docs.page.tsx"
import { Page, RenderMode, Route } from "mainz";

@Route("/docs/:slug")
@RenderMode("ssg")
export class DocsPage extends Page {}
```

## Dynamic segments stay readable

Mainz currently supports a few route patterns that keep intent obvious in the class itself:

- `"/docs/:slug"` for a single named segment
- `"/docs/[slug]"` as an equivalent bracket form
- `"/docs/*"` for a catch-all tail
- `"/docs/[...parts]"` for a named catch-all tail

Those params flow into `entries()`, `load()`, runtime navigation, and `this.route`.

```tsx title="Docs.page.tsx"
override load() {
  return fetchDoc(this.route.params.slug);
}

override render() {
  return <article>{this.data.title}</article>;
}
```

## `@Route(...)` and `entries()` do different jobs

`@Route(...)` declares the pattern.

`entries()` expands that pattern into concrete paths when SSG needs real output files.

```tsx title="Docs.page.tsx"
static async entries() {
  return [
    { params: { slug: "installation" } },
    { params: { slug: "quickstart" } },
  ];
}
```

Without the route annotation, Mainz does not know where the page belongs. Without `entries()`, a
dynamic SSG page does not know which concrete documents to emit.

## SPA definitions can still override the path

The page-first default is `@Route(...)`, but the navigation runtime also accepts an explicit `path`
in SPA page definitions when you need to wire pages manually.

That escape hatch is useful for app bootstrap code, but the framework model stays cleaner when the
page keeps its own route metadata.
