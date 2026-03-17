## Keep route intent on the page

`@route(...)` keeps the URL contract next to the page that owns it.

That matters because routing in Mainz is not an external config file first. The page carries the
metadata, while the runtime and build pipeline consume it.

```tsx title="Docs.page.tsx"
import { customElement, Page, route } from "mainz";

@customElement("app-docs-page")
@route("/docs/:slug")
export class DocsPage extends Page {
    static override page = {
        mode: "ssg" as const,
    };
}
```

## Dynamic segments stay readable

Mainz currently supports a few route patterns that keep intent obvious in the class itself:

- `"/docs/:slug"` for a single named segment
- `"/docs/[slug]"` as an equivalent bracket form
- `"/docs/*"` for a catch-all tail
- `"/docs/[...parts]"` for a named catch-all tail

Those params flow into `entries()`, `load()`, and runtime navigation.

```tsx title="Docs.page.tsx"
static async load({ params }: { params: Record<string, string> }) {
  return await fetchDoc(params.slug);
}

override render() {
  return <article>{this.props.data?.title}</article>;
}
```

## `@route(...)` and `entries()` do different jobs

`@route(...)` declares the pattern.

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

The page-first default is `@route(...)`, but the navigation runtime also accepts an explicit `path`
in SPA page definitions when you need to wire pages manually.

That escape hatch is useful for app bootstrap code, but the framework model stays cleaner when the
page keeps its own route metadata.
