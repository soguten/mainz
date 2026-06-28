---
title: Head and SEO
summary: Let Mainz manage canonical, hreflang, and page metadata without head duplication.
---

## Head should not duplicate

Mainz manages page-owned head tags so canonical links, hreflang entries, and
metadata stay synchronized across build and hydration.

That avoids a common failure mode where the build emits one thing and the client
appends another copy after boot.

## Metadata and assets are different concerns

In Mainz, `metadata()` is intentionally narrow.

Use it for:

- document title
- SEO metadata
- canonical and alternate links

Do not treat it as a general script, stylesheet, or inline style injection API.

When a route needs route-scoped scripts or other document assets, use
`assets()`.

When every route in the app needs the same asset, prefer `defineApp({ assets })`.
That includes shared scripts, `preconnect` hints, and shared font stylesheets.

For the full document injection model, including precedence and conditional
rules, see [Assets](../core/assets.md).

## Supported metadata fields

`metadata()` returns a small document metadata object:

```ts
interface PageMetadataDefinition {
  title?: string;
  meta?: readonly {
    name?: string;
    property?: string;
    content: string;
  }[];
  links?: readonly {
    rel: string;
    href: string;
    hreflang?: string;
  }[];
}
```

Use those fields as follows:

- `title` sets the document title
- `meta` emits `<meta>` tags such as description, robots, and Open Graph values
- `links` emits `<link>` tags such as canonical and alternate language entries

## Minimal example

```tsx
import { Page, Route } from "mainz";

@Route("/")
export class HomePage extends Page {
  override metadata() {
    return {
      title: "Hello Mainz",
      meta: [
        { name: "description", content: "Mainz starter home page" },
      ],
      links: [
        { rel: "canonical", href: "https://example.com/" },
      ],
    };
  }

  override render() {
    return <main>Hello Mainz</main>;
  }
}
```

## SEO example

Use `name` for standard metadata and `property` for graph-style metadata such as
Open Graph:

```tsx
import { Page, Route } from "mainz";

@Route("/docs/:slug")
export class DocsPage extends Page<{}, {}, { title: string; summary: string }> {
  override metadata() {
    const canonical = `https://example.com/docs/${this.route.params.slug}`;

    return {
      title: this.data.title,
      meta: [
        { name: "description", content: this.data.summary },
        { property: "og:title", content: this.data.title },
        { property: "og:description", content: this.data.summary },
        { property: "og:type", content: "article" },
      ],
      links: [
        { rel: "canonical", href: canonical },
      ],
    };
  }
}
```

## Alternate languages

Use `links` with `rel: "alternate"` and `hreflang` when the route exposes
locale-specific URLs:

```tsx
override metadata() {
  return {
    title: "Docs",
    links: [
      { rel: "canonical", href: "https://example.com/docs" },
      {
        rel: "alternate",
        href: "https://example.com/en/docs",
        hreflang: "en",
      },
      {
        rel: "alternate",
        href: "https://example.com/pt-BR/docs",
        hreflang: "pt-BR",
      },
    ],
  };
}
```

## What does not belong in metadata()

`metadata()` is not a general-purpose `<head>` escape hatch.

Do not use it for:

- `<script>` tags
- stylesheets or inline styles
- arbitrary document injection outside title, meta, and link metadata

Use `assets()` for route-scoped scripts and other document assets. Use
`defineApp({ assets })` for app-wide assets shared by every route.

## SEO follows the route manifest

Because SEO data is derived from the route manifest, features like locale-aware
canonical URLs and alternate links stay consistent across supported render and
navigation modes.
