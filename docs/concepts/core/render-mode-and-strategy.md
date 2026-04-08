---
title: Render Mode and Render Strategy
summary: Understand how pages define the route envelope, how components decide whether they block or defer, and how SSG policies shape build output.
---

## `RenderMode`, `RenderStrategy`, and `RenderPolicy` solve different problems

Mainz keeps routing and component assembly separate on purpose.

- `@RenderMode(...)` belongs to the page
- `@RenderStrategy(...)` belongs to the component
- `@RenderPolicy(...)` belongs to the component too, but only for build/SSG policy

Think about them like this:

- `RenderMode` defines the route envelope
- `RenderStrategy` defines when one component participates inside that route
- `RenderPolicy` defines what SSG should do with that component

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
- can it show `placeholder()` first?

```tsx title="DocsArticleContent.tsx"
export class DocsArticleContent extends Component<{}, NoState, DocsArticleModel> {
    override async load(context) {
        return await buildDocsArticleModel(this.route.params.slug, {
            signal: context.signal,
        });
    }

    override render(data: DocsArticleModel) {
        return <DocsArticlePage article={data} />;
    }
}
```

The component decides how its own `load()` participates inside the page. Mainz passes
`context.signal` to that load so a newer component load attempt or disconnect can abort the older one before it applies stale UI.

If a component declares `load()` and no `@RenderStrategy(...)`, Mainz treats it as `blocking` by default.

That also means deferred sibling components can settle independently:

- one child may abort because its load became stale
- another child may resolve successfully
- a third child may render its real `error()`

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
- `TeamLocations` could be `defer`
- `RecentlyViewedDocs` could be `blocking` plus `@RenderPolicy("placeholder-in-ssg")`

## The mental model

- `RenderMode("ssg")` asks: can Mainz emit shared HTML for this route ahead of time?
- `RenderMode("csr")` asks: should this route only come alive in the browser?
- `RenderStrategy("blocking")` asks: should this component participate in the first render path?
- `RenderStrategy("defer")` asks: can this component wait and render `placeholder()` first?
- `RenderPolicy("placeholder-in-ssg")` asks: should SSG emit `placeholder()` instead of resolved output?
- `RenderPolicy("hide-in-ssg")` asks: should SSG omit this component entirely?
- `RenderPolicy("forbidden-in-ssg")` asks: should SSG reject this component entirely?

That means `RenderStrategy(...)` is not an SSG-only feature. It matters in every mode.
`RenderPolicy(...)` is where Mainz currently concentrates SSG-specific component behavior.

## Matrix: `RenderMode` x `RenderStrategy`

### `csr` page + `blocking` component

- the component loads in the client runtime
- it participates in the first render path for that CSR route

Use this when the component is important to the first interactive render of a CSR page.

### `csr` page + `defer` component

- the component loads in the client runtime
- it can show `placeholder()` first and fill in later

Use this when the component is secondary and should not be treated as first-render-critical.

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

    override render(data: DocsArticleModel) {
        return <DocsArticlePage article={data} />;
    }
}
```

### `ssg` page + `defer` component

- the page still prerenders
- the component keeps its `placeholder()` in shared HTML
- the component resolves later in the browser

Use this for secondary UI like `On this page`, related content, or non-critical side panels.

```tsx title="OnThisPage.tsx"
@RenderStrategy("defer")
export class OnThisPage extends Component<{}, NoState, readonly Heading[]> {
    override async load(context) {
        return await collectArticleHeadings({
            signal: context.signal,
        });
    }

    override placeholder() {
        return <p>Scanning sections...</p>;
    }

    override render(data: readonly Heading[]) {
        return <OnThisPagePanel headings={data} />;
    }
}
```

## Matrix: `RenderMode("ssg")` x `RenderPolicy`

### `ssg` page + `placeholder-in-ssg` policy

- the page stays SSG
- Mainz emits `placeholder()` in shared HTML for that component
- the live component can still resolve later in the browser or runtime path

Use this for browser-local or user-specific state like recent pages, local preferences, or
authenticated UI.

```tsx title="RecentlyViewedDocs.tsx"
@RenderStrategy("blocking")
@RenderPolicy("placeholder-in-ssg")
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

    override placeholder() {
        return <p>Recent pages appear after you browse the docs.</p>;
    }

    override render(data: readonly RecentlyViewedDoc[]) {
        return <RecentDocsNav items={data} />;
    }
}
```

### `ssg` page + `hide-in-ssg` policy

- the page stays SSG
- the component does not emit any HTML during SSG
- runtime behavior can still instantiate it later outside build output

Use this when the component should disappear from prerendered output instead of leaving a visible placeholder.

### `ssg` page + `forbidden-in-ssg` policy

- the component is not allowed inside an SSG path
- Mainz should fail fast instead of pretending the route can prerender safely

Use this when the component is fundamentally incompatible with SSG.

## Why this matters more in SSG

The component strategy applies in every mode, but SSG makes the tradeoff concrete:

- does this component appear in shared HTML?
- does the build need its data?
- should users see final content, `placeholder()`, or nothing first?

That is why `RenderStrategy(...)` feels most visible in SSG, even though it is still the component's
timing contract everywhere else. SSG-specific exceptions now belong in `RenderPolicy(...)`.

## A practical rule

- page decides the route envelope
- component decides its render participation
- component policy decides what SSG should emit for that component
- `Component.load()` is the normal component-owned async path

If a route should be statically emitted, use `@RenderMode("ssg")`.

If a component should block or defer, use `@RenderStrategy(...)`.

If a component needs special SSG handling such as placeholder output, omission, or rejection, use
`@RenderPolicy(...)`.

For route expansion and the ownership split between page and component, see
[Data Loading](./data-loading.md).
