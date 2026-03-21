## `defineResource(...)` and `ComponentResource`

This is the core data model for dynamic Mainz components.

If you remember only one split, remember this one:

- the page defines the route envelope
- the resource defines the data policy
- the component defines how that data participates in rendering

That means these three primitives have different jobs:

- `@RenderMode(...)` belongs to the page
- `defineResource(...)` defines the data source and its policy
- `@RenderStrategy(...)` + `ComponentResource` define how a component consumes that data

## Why Mainz has a resource model

Mainz needs to solve a real tension:

- some data belongs to the route and should block the initial page render
- some data belongs to a component and should stay local to that component
- some data is safe for SSG
- some data is private or browser-only and must never enter shared HTML

If every component just fetched however it wanted, Mainz would lose the ability to answer:

- can this run during SSG?
- can this be serialized into HTML?
- does this belong in the initial render?
- should this fail in the build?

`defineResource(...)` exists to make those answers explicit.

## What `defineResource(...)` actually defines

A resource is not a component and it is not a route.

A resource is a description of a data dependency.

It answers:

- what this data is called
- whether it is public or private
- where it is allowed to execute
- how it is cached
- how it is loaded

Example:

```ts title="docsArticleResource.ts"
import { defineResource } from "mainz";

export const docsArticleResource = defineResource({
  name: "docs-article",
  visibility: "public",
  execution: "either",
  cache: "static",
  key: ({ slug }) => ["docs-article", slug],
  load: async ({ slug }) => {
    return await getDocsArticle(slug);
  },
});
```

This says:

- the data is named `docs-article`
- it is public
- it can run at build time or in the browser
- it is static for caching purposes
- it is loaded from a `slug`

The resource still does **not** say whether this data blocks the route or waits until later.

That part belongs to the component.

## Resource fields in practice

### `name`

Use this for:

- diagnostics
- debugging
- clearer build and CLI messages

If a resource is diagnosed by `mainz diagnose`, the name is what appears in the message.

### `visibility`

This answers:

- can the data safely participate in shared HTML?

Values:

- `public`
- `private`

Use `public` when the same route output can be shared for every user.

Use `private` when the data depends on:

- auth
- session
- cookies
- per-user state
- browser-local state that should never appear in SSG output

### `execution`

This answers:

- where is the resource allowed to run?

Values:

- `build`
- `client`
- `either`

Examples:

- markdown article content can often use `either`
- browser-local recent pages should use `client`
- a build-only content index could use `build`

### `cache`

This answers:

- how should Mainz think about reusing this result?

Today the important distinction is mainly intent:

- `static`
- `no-store`
- `{ revalidate: number }`

Even where runtime support is still evolving, this metadata is still useful because it declares the
policy clearly.

### `key(...)`

This answers:

- what identifies one value of this resource?

Example:

```ts
key: ({ slug, locale }) => ["docs-article", locale, slug]
```

This is how Mainz can tell whether the component is still looking at the same data or a new one.

### `load(...)`

This is the actual loader.

It returns the data that the component or page needs.

## What `ComponentResource` does

Once a resource exists, a component can consume it with `ComponentResource`.

`ComponentResource` is the runtime primitive that:

- reads the resource
- passes params into it
- coordinates fallback vs resolved content
- respects the component's `@RenderStrategy(...)`
- flows errors through the boundary logic

Example:

```tsx title="DocsArticleContent.tsx"
import { Component, ComponentResource, RenderStrategy } from "mainz";
import { docsArticleResource } from "../resources/docsArticleResource.ts";

@RenderStrategy("blocking", {
  fallback: () => <p>Loading article...</p>,
})
export class DocsArticleContent extends Component<{ slug?: string }> {
  override render() {
    return (
      <ComponentResource
        resource={docsArticleResource}
        params={{ slug: this.props.slug }}
        context={undefined}
      >
        {(article) => <article>{article.title}</article>}
      </ComponentResource>
    );
  }
}
```

`ComponentResource` does not replace the component.

It just resolves the data for the component.

The component still owns:

- markup
- composition
- which params it passes
- which strategy it uses

## How `@RenderStrategy(...)` changes `ComponentResource`

This is the crucial connection:

- the resource defines the data policy
- the component strategy defines how that data participates in rendering

Example:

```tsx
@RenderStrategy("blocking")
```

means:

- this component wants to participate in the first render path

```tsx
@RenderStrategy("deferred")
```

means:

- this component can render a fallback first and resolve later

```tsx
@RenderStrategy("client-only")
```

means:

- this component should resolve only in the browser

So the same style of `ComponentResource` usage can behave differently depending on the component
strategy.

## A concrete mental model

Think about the chain like this:

1. page says whether the route is `ssg` or `csr`
2. component says whether it is `blocking`, `deferred`, or `client-only`
3. resource says whether the underlying data is public/private and build/client/either

That is the full contract.

## `page.load()` versus `ComponentResource`

This is one of the most important distinctions in Mainz.

Use `page.load()` when:

- the page owns the data
- the route itself depends on it
- you want route-blocking data
- you want the page contract to say "this route needs this before render"

Use `defineResource(...) + ComponentResource` when:

- the data belongs to a component
- the page can stay thinner
- the component should control its own assembly
- the component may be `deferred` or `client-only`

In other words:

- `page.load()` is route-oriented
- `ComponentResource` is component-oriented

## Example: route-owned data

```tsx title="Product.page.tsx"
@Route("/products/:slug")
@RenderMode("ssg")
export class ProductPage extends Page<{ data?: Product }> {
  static entries = entries.from(products, (product) => ({
    slug: product.slug,
  }));

  static load = load.byParam("slug", (slug) => getProduct(slug));

  override render() {
    return <ProductView product={this.props.data} />;
  }
}
```

The page owns the product.

## Example: component-owned data

```tsx title="Docs.page.tsx"
@Route("/docs/:slug")
@RenderMode("ssg")
export class DocsPage extends Page<{ route?: { params?: Record<string, string> } }> {
  static entries = entries.from(docsArticles, (article) => ({
    slug: article.slug,
  }));

  override render() {
    return <DocsArticleContent slug={this.props.route?.params?.slug} />;
  }
}
```

```tsx title="DocsArticleContent.tsx"
@RenderStrategy("blocking", {
  fallback: () => <p>Loading article...</p>,
})
export class DocsArticleContent extends Component<{ slug?: string }> {
  override render() {
    return (
      <ComponentResource
        resource={docsArticleResource}
        params={{ slug: this.props.slug }}
        context={undefined}
      >
        {(article) => <DocsShell title={article.title} markdown={article.markdown} />}
      </ComponentResource>
    );
  }
}
```

The page owns the route.

The component owns the article assembly.

The resource owns the data policy.

## What this looks like for `client-only`

```ts title="recentlyViewedDocsResource.ts"
const recentlyViewedDocsResource = defineResource({
  name: "recent-docs",
  visibility: "private",
  execution: "client",
  cache: "no-store",
  key: ({ currentSlug }) => ["recent-docs", currentSlug ?? null],
  load: ({ currentSlug }) => readRecentDocsFromLocalStorage(currentSlug),
});
```

```tsx title="RecentlyViewedDocs.tsx"
@RenderStrategy("client-only", {
  fallback: () => <RecentDocsPlaceholder />,
})
export class RecentlyViewedDocs extends Component<{ currentSlug?: string }> {
  override render() {
    return (
      <ComponentResource
        resource={recentlyViewedDocsResource}
        params={{ currentSlug: this.props.currentSlug }}
        context={undefined}
      >
        {(items) => <RecentDocsNav items={items} />}
      </ComponentResource>
    );
  }
}
```

This is the same primitive, but with a different policy:

- the resource is private
- the resource is client-only
- the component is client-only
- the fallback becomes the shared HTML

That is why this model fits so well with SSG safety.

## How `mainz diagnose` helps

The diagnostics story now understands this model.

Today `mainz diagnose` can already warn about cases like:

- a `Component` renders `ComponentResource` but forgets `@RenderStrategy(...)`
- a `deferred` or `client-only` `ComponentResource` owner forgets a fallback
- a `blocking` `ComponentResource` owner clearly points at a locally declared `private` resource
- a `blocking` `ComponentResource` owner points at a locally declared resource that omits
  `visibility`, which still defaults to `private`
- a `blocking` `ComponentResource` owner clearly points at a locally declared `client` resource

That means the CLI can catch suspicious combinations before they become build failures later.

Example:

```tsx
const currentUserResource = defineResource({
  name: "current-user",
  visibility: "private",
  execution: "either",
  load: async () => getCurrentUser(),
});

@RenderStrategy("blocking")
export class UserMenu extends Component {
  override render() {
    return (
      <ComponentResource resource={currentUserResource} params={undefined} context={undefined}>
        {(user) => <p>{user.name}</p>}
      </ComponentResource>
    );
  }
}
```

This can work in CSR.

But if it ever enters an SSG path, it will fail, because:

- `blocking` says the component wants to participate in the initial render path
- `private` says the data must not participate in shared SSG output

So `mainz diagnose` warns early.

For the CLI itself, see [Diagnostics CLI](./diagnostics-cli.md).

## A practical decision guide

Ask these questions in order:

1. Does the route itself need this data before first render?
2. Is the data public or private?
3. Can it run at build time, in the client, or both?
4. Should this component block, defer, or wait for the browser?

If the route owns the answer to question 1, use `page.load()`.

If the component owns the answer to question 4, use `defineResource(...) + ComponentResource`.

## The Mainz split in one sentence

- `defineResource(...)` defines the data policy
- `ComponentResource` resolves that policy inside a component
- `@RenderStrategy(...)` decides how that resolution participates in rendering

If you also want the route-level layer in the same picture, pair this page with
[Render Mode and Render Strategy](./render-mode-and-strategy.md) and
[Public Shell, Private Island](./public-shell-private-island.md).
