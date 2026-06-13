---
title: Assets
summary: Add document scripts, links, styles, and noscript fallbacks at the app or page level with one shared resolution pipeline.
---

## Assets manage document resources

Use assets for document resources such as:

- scripts
- stylesheet and preload links
- inline styles
- `noscript` fallbacks

The app and each page can contribute those resources through one typed pipeline.

## Two levels contribute to the same pipeline

Assets can come from:

- `defineApp({ assets })` for app-wide document concerns
- `Page.assets()` for route-owned document concerns

Both levels converge into one resolved list before Mainz renders the document or
updates it during navigation.

```tsx title="app.ts"
import { defineApp, link, script } from "mainz";
import { HomePage } from "./pages/Home.page.tsx";

export const app = defineApp({
  id: "site",
  pages: [HomePage],
  assets: [
    link({
      id: "brand-fonts",
      rel: "stylesheet",
      href:
        "https://fonts.googleapis.com/css2?family=Literata:wght@400;700&display=swap",
    }),
    script({
      id: "analytics-loader",
      src: "https://cdn.example.com/analytics.js",
      strategy: "async",
      when: ({ env }) => env.prod,
    }),
  ],
});
```

```tsx title="Docs.page.tsx"
import { Page, Route, script } from "mainz";

@Route("/docs/:slug")
export class DocsPage extends Page {
  override assets() {
    return [
      script({
        id: "docs-search",
        src: "/assets/docs-search.js",
        target: "body:end",
        strategy: "defer",
        when: ({ route }) => route.path.startsWith("/docs"),
      }),
    ];
  }
}
```

## Supported asset types

Mainz currently supports:

- `script(...)`
- `link(...)`
- `style(...)`
- `noscript(...)`
- `disableAsset(...)`

That gives one shared model for third-party SDKs, font links, inline theme
variables, and `<noscript>` fallbacks without falling back to handwritten head
management.

## App and page assets use the same rules

App-level and route-level assets share the same resolution behavior.

### `when(context)`

Every asset can declare `when(context)`.

When `when` is omitted, Mainz treats it as `true`.

The context is synchronous and intentionally small so the same rule works in
build and runtime.

```tsx title="Conditional asset"
script({
  id: "ga-core",
  src: "https://www.googletagmanager.com/gtag/js?id=G-XXXX",
  strategy: "async",
  when: ({ env, route, runtime }) =>
    env.prod &&
    runtime.renderMode !== "csr" &&
    !route.path.startsWith("/admin"),
});
```

The current context shape includes:

- `app.id`
- `env.dev`
- `env.prod`
- `env.mode`
- `runtime.phase`
- `runtime.renderMode`
- `runtime.navigation`
- `route.path`
- `route.locale`

## Precedence and suppression

Assets are keyed by `id`.

When the app and page contribute the same `id`, the page wins.

That gives routes a precise override surface without forcing inheritance.

When the route must suppress an app asset entirely, return
`disableAsset("asset-id")` from `assets()`.

```tsx title="Suppress a global asset"
import { disableAsset, Page, Route } from "mainz";

@Route("/privacy")
export class PrivacyPage extends Page {
  override assets() {
    return [disableAsset("analytics-loader")];
  }
}
```

## Ordering and dependencies

Assets can coordinate with:

- `dependsOn`
- `before`
- `after`

Mainz resolves app and page contributions together, then orders the merged
result.

That means a page asset can depend on an app asset, and an app asset can be
positioned relative to another app asset in the same graph.

```tsx title="Ordered assets"
assets: [
  script({
    id: "consent-sdk",
    src: "https://cdn.example.com/consent.js",
  }),
  script({
    id: "analytics-bootstrap",
    inline: "window.dataLayer = window.dataLayer || [];",
    after: ["consent-sdk"],
    when: ({ env }) => env.prod,
  }),
];
```

Ordering rules only apply inside the same document region. Mainz rejects
cross-region relationships and circular references with diagnostics that name
the offending assets.

## Targets decide where the asset lands

Assets can target different document regions:

- `head`
- `body:start`
- `body:end`

`head` is the default.

Choose the target based on document semantics rather than trying to manually
append nodes later.

## Build and runtime use the same asset list

Assets are not a runtime-only feature.

The same resolved assets participate in:

- SSR document responses
- SSG document output
- client navigation updates

That keeps the document consistent across initial render, hydration, and later
route changes.

## Asset URLs can come from three places

Asset definitions answer:

- where the resource lands in the document
- when it loads
- how it is ordered

The URL itself can come from one of three sources:

- an external URL
- a public file served by the target
- a bundler-resolved import

### External URLs

External URLs are the simplest case.

```tsx title="External CDN asset"
script({
  id: "analytics-loader",
  src: "https://cdn.example.com/analytics.js",
  strategy: "async",
});
```

### Public files served by the target

Each target now has an official public file story.

Mainz treats `<target root>/public` as the browser-facing public directory for
that target.

That means a file such as:

```txt title="Target public files"
site/
  public/
    assets/
      docs-search.js
      fonts/
        brand.woff2
```

can be referenced directly:

```tsx title="Public target files"
script({
  id: "docs-search",
  src: "/assets/docs-search.js",
});

link({
  id: "brand-font",
  rel: "preload",
  href: "/assets/fonts/brand.woff2",
  as: "font",
  crossorigin: "anonymous",
});
```

### Bundler-resolved imports from the workspace or packages

When the resource should come from the workspace or from a package dependency,
prefer importing its emitted URL and then passing that string into the asset
definition.

```tsx title="Bundled asset URLs"
import docsSearchUrl from "./assets/docs-search.js?url";
import brandFontUrl from "./assets/fonts/brand.woff2?url";
import workerUrl from "@acme/docs-search/worker.js?url";

script({
  id: "docs-search",
  src: docsSearchUrl,
});

link({
  id: "brand-font",
  rel: "preload",
  href: brandFontUrl,
  as: "font",
  crossorigin: "anonymous",
});

script({
  id: "docs-worker",
  src: workerUrl,
  when: ({ route }) => route.path.startsWith("/docs"),
});
```

This path is especially useful when the asset:

- lives outside `public/`
- comes from `node_modules` or another package source
- should participate in the bundler pipeline

Mainz then treats the resolved string like any other asset URL. Path rewriting
for SSG route depth still happens at the final document stage.

## When to use assets and when not to

Use assets when the concern is document-level injection.

Good fits:

- analytics loaders
- ads and consent managers
- shared fonts
- syntax-highlighting runtimes
- route-owned inline theme or critical CSS

Avoid assets when the concern belongs inside component render output or page
metadata.

If the resource is visible content, render it in the component tree. If it is
SEO metadata, keep it in `metadata()`.
