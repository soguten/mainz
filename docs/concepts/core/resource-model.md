---
title: Resource Model
slug: resource-model
summary: Extract reusable data contracts without hiding whether the page or component owns the async work.
order: 4
---

## Reusable data contracts after the ownership shift

Mainz no longer teaches async loading through special resource-backed component primitives.

The main model is now:

- `entries()` for route expansion
- `Page.load()` for route-owned data
- `Component.load()` for component-owned async assembly

That keeps rendering ownership visible in the page and component classes themselves.

## Start with ownership, then extract reuse

When a route or component needs data, ask first:

1. Does the page own this data?
2. Does a nested component own this sub-tree?

If the page owns it, use `Page.load()`.

If the component owns it, use `Component.load()`.

Only after that should you extract a reusable data module for sharing loaders, cache policy, or
environment constraints across multiple pages.

## A reusable data contract is just a module

You do not need a special component primitive to share loading logic.

Keep reusable route data in ordinary modules:

```ts title="docs-article-data.ts"
export const docsArticleData = {
    name: "docs-article",
    cache: "static" as const,
    async load(slug: string) {
        return await getDocsArticle(slug);
    },
};
```

Then consume it from the owner that actually controls rendering:

```tsx title="Docs.page.tsx"
@Route("/docs/:slug")
@RenderMode("ssg")
export class DocsPage extends Page {
    static entries() {
        return docs.map((doc) => ({
            params: { slug: doc.slug },
        }));
    }

    override async load() {
        const article = await docsArticleData.load(this.route.params.slug);
        return {
            head: buildDocsHead(article),
        };
    }
}
```

Or from a component owner:

```tsx title="DocsArticleContent.tsx"
@RenderStrategy("blocking")
export class DocsArticleContent extends Component<{}, NoState, DocsArticleModel> {
    override async load() {
        return await docsArticleData.load(this.route.params.slug);
    }

    override render() {
        return <DocsArticlePage article={this.data} />;
    }
}
```

## What belongs in a reusable data contract

Keep only policy and loading logic there:

- a stable name for logs and debugging
- cache or diagnostics intent
- environment constraints such as build-only or browser-only execution
- the loader itself

Do not move render ownership into that module.

The route or component still decides:

- whether the data blocks first render
- whether it is deferred
- whether it is client-only
- which fallback or error fallback to show

## Practical guidance

Use reusable data contracts when:

- multiple pages need the same loader
- multiple components need the same server/client policy
- you want one place to describe cache semantics

Do not extract them just because async code exists.

If only one owner needs the data, keeping the load logic inline is usually clearer.

## The core idea

Mainz now keeps the async model simple:

- reusable modules describe data concerns
- `Page.load()` and `Component.load()` describe ownership
- `@RenderMode(...)` and `@RenderStrategy(...)` describe rendering behavior

For the ownership-first loading flow, see [Data Loading](./data-loading.md).
