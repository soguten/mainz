## `RenderMode` and `RenderStrategy` solve different problems

Mainz keeps routing and component assembly separate on purpose.

- `@RenderMode(...)` belongs to the page
- `@RenderStrategy(...)` belongs to the component

Think about them like this:

- `RenderMode` defines the route envelope
- `RenderStrategy` defines how one component participates inside that route

Those two decisions stay separate from whether a route is static or dynamic.

## Page decides the route envelope

`@RenderMode(...)` is page-level.

It answers questions like:

- should this route be prerendered as shared HTML?
- or should it only come alive in the browser?

```tsx title="Docs.page.tsx"
@Route("/docs/:slug")
@RenderMode("ssg")
export class DocsPage extends Page {
    override render() {
        return <DocsArticleContent />;
    }
}
```

The page decides that `/docs/:slug` is an SSG route.

## Component decides render participation

`@RenderStrategy(...)` is component-level.

It answers questions like:

- should this component block the first render?
- can it show fallback first?
- should it wait for the browser?

```tsx title="DocsArticleContent.tsx"
export class DocsArticleContent extends Component<{}, NoState, DocsArticleModel> {
    override async load(context) {
        return await buildDocsArticleModel(this.route.params.slug, {
            signal: context.signal,
        });
    }

    override render() {
        return <DocsArticlePage article={this.data} />;
    }
}
```

The component decides how its own `load()` participates inside the page.
Mainz passes `context.signal` to that load so a newer component load attempt or disconnect can abort the older one before it applies stale UI.

If a component declares `load()` and no `@RenderStrategy(...)`, Mainz treats it as `blocking` by default.

That also means deferred sibling components can settle independently:

- one child may abort because its load became stale
- another child may resolve successfully
- a third child may render its real `errorFallback`

Mainz keeps those outcomes isolated per component load attempt.

When a component has `load()` but no local state, prefer `NoState` in the second generic slot so the intent stays visible.

## These are separate choices

In that example:

- the route is dynamic because of `:slug`
- the page is `ssg` because of `@RenderMode("ssg")`
- the component is `blocking` because of `@RenderStrategy("blocking")`

Those are three separate decisions.

The same component strategy ideas also apply to a static route like `/about`.

```tsx title="About.page.tsx"
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

- `RenderMode("ssg")` asks: can Mainz emit shared HTML for this route ahead of time?
- `RenderMode("csr")` asks: should this route only come alive in the browser?
- `RenderStrategy("blocking")` asks: should this component participate in the first render path?
- `RenderStrategy("deferred")` asks: can this component wait and render a placeholder first?
- `RenderStrategy("client-only")` asks: should this component skip build-time loading and resolve
  only in the browser?

That means `RenderStrategy(...)` is not an SSG-only feature. It matters most in SSG because build
output makes the differences visible, but it still describes component behavior in CSR too.

## Matrix: `RenderMode` x `RenderStrategy`

### `csr` page + `blocking` component

- the component loads in the client runtime
- it participates in the first render path for that CSR route

Use this when the component is important to the first interactive render of a CSR page.

### `csr` page + `deferred` component

- the component loads in the client runtime
- it can show a fallback first and fill in later

Use this when the component is secondary and should not be treated as first-render-critical.

### `csr` page + `client-only` component

- the component still loads in the client runtime
- the practical difference is smaller because there is no prerendered HTML to protect
- the strategy still documents that this data belongs in the browser only

### `ssg` page + `blocking` component

- the component can participate in build output
- its `load()` can resolve during prerender

Use this for public content that belongs in the first HTML response.

```tsx title="DocsArticleContent.tsx"
@RenderStrategy("blocking")
export class DocsArticleContent extends Component<{}, NoState, DocsArticleModel> {
    override async load(context) {
        return await buildDocsArticleModel(this.route.params.slug, {
            signal: context.signal,
        });
    }

    override render() {
        return <DocsArticlePage article={this.data} />;
    }
}
```

### `ssg` page + `deferred` component

- the page still prerenders
- the component keeps its fallback in shared HTML
- the component resolves later in the browser

Use this for secondary UI like `On this page`, related content, or non-critical side panels.

```tsx title="OnThisPage.tsx"
@RenderStrategy("deferred", {
    fallback: () => <p>Scanning sections...</p>,
})
export class OnThisPage extends Component<{}, NoState, readonly Heading[]> {
    override async load(context) {
        return await collectArticleHeadings({
            signal: context.signal,
        });
    }

    override render() {
        return <OnThisPagePanel headings={this.data} />;
    }
}
```

### `ssg` page + `client-only` component

- the page stays SSG
- the component skips build-time data resolution
- Mainz emits the fallback in shared HTML, then resolves the component after hydration

Use this for browser-local or user-specific state like recent pages, local preferences, or
authenticated UI.

```tsx title="RecentlyViewedDocs.tsx"
@RenderStrategy("client-only", {
    fallback: () => <p>Recent pages appear after you browse the docs.</p>,
})
export class RecentlyViewedDocs extends Component<
    {},
    NoState,
    readonly RecentlyViewedDoc[]
> {
    override async load(context) {
        return readRecentDocsFromLocalStorage(this.route.params.slug, {
            signal: context.signal,
        });
    }

    override render() {
        return <RecentDocsNav items={this.data} />;
    }
}
```

### `ssg` page + `forbidden-in-ssg` component

- the component is not allowed inside an SSG path
- Mainz should fail fast instead of pretending the route can prerender safely

Use this when the component is fundamentally incompatible with SSG.

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
- `Component.load()` is the normal component-owned async path

If a route should be statically emitted, use `@RenderMode("ssg")`.

If a component should block, defer, wait for the browser, or reject SSG participation, use
`@RenderStrategy(...)`.

For route expansion and the ownership split between page and component, see
[Data Loading](./data-loading.md).
