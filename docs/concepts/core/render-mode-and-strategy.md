## `RenderMode` and `RenderStrategy` solve different problems

Mainz keeps routing and component assembly separate on purpose.

- `@RenderMode(...)` belongs to the page
- `@RenderStrategy(...)` belongs to the component

Think about them like this:

- `RenderMode` defines the route envelope
- `RenderStrategy` defines how one part of that route participates in rendering

Those two decisions are independent from whether the route is static or dynamic.

- a route can be static or dynamic
- a page can use `csr` or `ssg`
- a component inside that page can still be `blocking`, `deferred`, or `client-only`

Dynamic routes make the examples easier to see because they often involve real data loading, but
`@RenderStrategy(...)` is not a "dynamic route feature". It is a component rendering policy.

```tsx title="Docs.page.tsx"
import { CustomElement, Page, RenderMode, Route } from "mainz";
import { DocsArticleContent } from "../components/DocsArticleContent.tsx";

@CustomElement("x-mainz-docs-page")
@Route("/docs/:slug")
@RenderMode("ssg")
export class DocsPage extends Page<{ route?: { params?: Record<string, string> } }> {
  override render() {
    return <DocsArticleContent slug={this.props.route?.params?.slug} />;
  }
}
```

```tsx title="DocsArticleContent.tsx"
import { Component, ComponentResource, RenderStrategy } from "mainz";

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

The page decides that `/docs/:slug` is an SSG route. The component decides whether its own data is
blocking, deferred, or client-only inside that route.

In this example:

- the route is dynamic because of `:slug`
- the page is `ssg` because of `@RenderMode("ssg")`
- the component is `blocking` because of `@RenderStrategy("blocking")`

Those are three separate choices.

The same component strategy ideas also apply to a static route like `/about`:

```tsx title="About.page.tsx"
@CustomElement("x-mainz-about-page")
@Route("/about")
@RenderMode("ssg")
export class AboutPage extends Page {
  override render() {
    return (
      <>
        <AboutHero />
        <TeamLocations />
        <RecentlyViewedDocs />
      </>
    );
  }
}
```

Here the route is static, but the components can still have different strategies:

- `AboutHero` could be `blocking`
- `TeamLocations` could be `deferred`
- `RecentlyViewedDocs` could be `client-only`

## The mental model

- `RenderMode("ssg")` asks: can Mainz emit HTML for this route ahead of time?
- `RenderMode("csr")` asks: should this route only come alive in the browser?
- `RenderStrategy("blocking")` asks: should this component participate in the first render?
- `RenderStrategy("deferred")` asks: can this component wait and render a placeholder first?
- `RenderStrategy("client-only")` asks: should this component skip build-time rendering and resolve only in the browser?

That means `RenderStrategy(...)` is not an SSG-only feature. It matters most in SSG because build
output makes the differences visible, but it still describes component behavior in CSR too.

## Matrix: `RenderMode` x `RenderStrategy`

### `csr` page + `blocking` component

- the component loads in the client runtime
- it can still show a fallback while its resource resolves
- there is no SSG HTML to protect

Use this when the component is important to the first interactive render of a CSR page.

### `csr` page + `deferred` component

- the component also loads in the client runtime
- it can show a fallback first and fill in later
- today the runtime path is close to `blocking`, but the intent is different

Use this when the component is secondary and should not be treated as first-render-critical.

### `csr` page + `client-only` component

- the component loads in the client runtime
- there is no build step involved, so the practical difference is smaller
- the strategy still documents that this component never belongs in prerendered output

Use this when the component depends on browser APIs, session state, `localStorage`, or any other
browser-local source of truth.

### `ssg` page + `blocking` component

- the component can participate in build output
- the resource must be public and build-compatible
- Mainz may render the final HTML during prerender

Use this for the main article body, public docs content, or any data that must exist in the first
HTML response.

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

### `ssg` page + `deferred` component

- the page can still be prerendered
- the component does not block the initial HTML
- Mainz keeps the fallback in SSG output and resolves the resource later in the browser

Use this for secondary UI like `On this page`, related articles, or non-critical callouts.

```tsx title="OnThisPage.tsx"
@RenderStrategy("deferred", {
  fallback: () => <p>Scanning sections...</p>,
})
export class OnThisPage extends Component<{ slug?: string }> {
  override render() {
    return (
      <ComponentResource
        resource={onThisPageResource}
        params={{ slug: this.props.slug }}
        context={undefined}
      >
        {(headings) => <OnThisPagePanel headings={headings} />}
      </ComponentResource>
    );
  }
}
```

### `ssg` page + `client-only` component

- the page stays SSG
- the component skips build-time data resolution
- Mainz emits the fallback in shared HTML, then resolves the component after hydration

Use this for browser-local or user-specific state like recently viewed pages, local preferences, or
authenticated UI.

```tsx title="RecentlyViewedDocs.tsx"
@RenderStrategy("client-only", {
  fallback: () => <p>Recent pages appear after you browse the docs.</p>,
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

## Why this matters more in SSG

The component strategy applies in every mode, but SSG makes the tradeoff concrete:

- does this component appear in shared HTML?
- does the build need its data?
- should users see final content or a placeholder first?

That is why `RenderStrategy(...)` feels most visible in SSG, even though it is still the component's
render policy everywhere else.

## A practical rule

- page decides the route envelope
- component decides its render participation
- `ComponentResource` resolves the component's data

If a route should be statically emitted, use `@RenderMode("ssg")`.

If a component should block, defer, or wait for the browser, use `@RenderStrategy(...)`.

For the data layer that sits underneath those strategies, see
[Resource Model](./resource-model.md).
