## Route expansion, route data, and component loading

Mainz now treats async loading as an ownership question.

- `entries()` belongs to the page because route expansion is a page concern
- `Page.load()` belongs to the page instance when the page owns the data
- `Page.head()` belongs to the page instance when the document head depends on resolved page data
- `Component.load()` belongs to the component when the component owns the async assembly

That keeps the mental model aligned with the class tree you already see in the app.

## `entries()` expands static paths

For SSG, a dynamic route needs concrete params. `entries()` gives the build enough information to
materialize real paths.

The framework only passes `locale`. Everything else can be loaded directly by the page from files,
CMS, or any service reachable at build time.

```tsx title="Docs.page.tsx"
@Route("/docs/:slug")
@RenderMode("ssg")
export class DocsPage extends Page {
    static async entries({ locale }: { locale?: string }) {
        return getDocsForLocale(locale).map((doc) => ({
            params: { slug: doc.slug },
        }));
    }
}
```

`entries()` answers only one question:

- which concrete route params exist?

It does not share data with `Page.load()` or `Component.load()`.

## `Page.load()` is instance-owned page data loading

Use `Page.load()` when the page instance owns the data contract.

Typical examples:

- head metadata
- route-level entity identity
- route data the page must know before it can define its output
- aggregate page payloads later distributed to child components

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
        const article = await fetchDocHead(this.route.params.slug);
        return {
            article,
        };
    }

    override head() {
        return {
            title: this.data.article.title,
        };
    }

    override render() {
        return <DocsArticleContent />;
    }
}
```

Use `Page.load()` when the page owns the answer. `head()` and `render()` both run on that same
page instance, so they can consume `this.data` directly.

`Page.load()` now also receives `context.signal`.

That signal belongs to the current managed navigation and should be treated as the web-native
equivalent of a propagated cancellation token. If a later navigation supersedes the current one, or
the controller is cleaned up, Mainz aborts that signal so route-owned work can stop early and avoid
applying stale results.

```ts
override async load(context: PageLoadContext) {
    const response = await fetch("/api/docs", {
        signal: context.signal,
    });

    return await response.json();
}
```

This cancellation contract is runtime navigation-specific.

It does not apply to `entries()`, because `entries()` belongs to build/prerender expansion rather
than runtime navigation.

## `Component.load()` is for component-owned async assembly

When the page only needs to declare the route and maybe expand SSG outputs, the component can own
the async assembly directly.

This is now the main user-facing async path in Mainz:

- `Component`
- `Component.load()`
- optional `@RenderStrategy(...)` when the component should not use the default `blocking` behavior

When a loaded component has no local state, use `NoState` in the second generic slot:

- `Component<Props, NoState, Data>`

```tsx title="Docs.page.tsx"
@Route("/docs/:slug")
@RenderMode("ssg")
export class DocsPage extends Page {
    static entries() {
        return docs.map((doc) => ({
            params: { slug: doc.slug },
        }));
    }

    override render() {
        return <DocsArticleContent />;
    }
}
```

```tsx title="DocsArticleContent.tsx"
export class DocsArticleContent extends Component<{}, NoState, DocsPageModel> {
    override async load(context) {
        return await buildDocsArticlePageModel(this.route.params.slug, {
            signal: context.signal,
        });
    }

    override render() {
        return <DocsArticlePage article={this.data} />;
    }
}
```

In other words:

- page owns the route
- component owns the async assembly
- `render()` stays synchronous and only consumes already available state
- `context.signal` lets component-owned load work stop when Mainz supersedes or tears down that load

## `this.data` is the resolved component value

When a component declares `load()`, Mainz exposes the resolved value through `this.data`.

That means:

- `load()` stays the async hook
- `render()` stays synchronous
- the component reads its own resolved value directly from `this.data`

```tsx
@RenderStrategy("blocking")
export class ProductDetails extends Component<{ slug: string }, NoState, Product> {
    override async load(context) {
        return await getProduct(this.props.slug, {
            signal: context.signal,
        });
    }

    override render() {
        return <article>{this.data.title}</article>;
    }
}
```

`Component.load()` now receives `context.signal`.

That signal belongs to the current component load attempt. Mainz aborts it when:

- props change and the component starts a fresher load
- the component disconnects before the load settles

That lets component-owned work cooperate with cancelation and prevents stale resolutions from being
treated as current UI.

## `load()` is not initial state

`load()` answers a different question from `initState()`.

- `initState()` is for local UI state the component already knows before first render
- `load()` is for async data that does not exist yet
- `fallback` is for the placeholder while that data is still pending

So if the only thing you want to represent is "still loading", do not mirror that into component
state.

Prefer:

- `Component<Props, NoState, Data>` when the component only needs async data
- `Component<Props, State, Data>` only when the component also owns local UI state such as:
  - panel open or closed
  - filter text typed by the user
  - selected tab

A good smell check is:

- if the value can be known synchronously by the component, it can live in `initState()`
- if the value must be awaited, it belongs in `load()`

## `@RenderStrategy(...)` now applies to `Component.load()`

`@RenderStrategy(...)` stays a component concern, but it now describes how `Component.load()`
participates in rendering when the component needs behavior other than the default `blocking`
strategy.

### `blocking`

- this is the default when a component declares `load()` and does not declare `@RenderStrategy(...)`
- the component load can participate in the initial render path
- use this when the component belongs in the first render

### `deferred`

- the component renders its fallback first
- the load resolves later

### `client-only`

- the component load resolves only in the browser
- use this for browser-local or user-specific state

### `forbidden-in-ssg`

- the component cannot appear inside an SSG path

If a component uses `deferred` or `client-only`, provide a fallback so the placeholder stays
explicit.

If a component keeps the default `blocking` behavior, adding a fallback is usually misleading
because blocking owners normally render resolved output instead of visible loading UI.

## Example: `deferred`

```tsx title="OnThisPage.tsx"
@RenderStrategy("deferred", {
    fallback: () => <p>Scanning sections...</p>,
})
export class OnThisPage extends Component<{ slug?: string }, NoState, readonly Heading[]> {
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

## Example: `client-only`

```tsx title="RecentlyViewedDocs.tsx"
@RenderStrategy("client-only", {
    fallback: () => <RecentDocsPlaceholder />,
})
export class RecentlyViewedDocs extends Component<
    { currentSlug?: string },
    NoState,
    readonly RecentlyViewedDoc[]
> {
    override async load(context) {
        return readRecentDocsFromLocalStorage(this.props.currentSlug, {
            signal: context.signal,
        });
    }

    override render() {
        return <RecentDocsNav items={this.data} />;
    }
}
```

This keeps SSG HTML shared and deterministic while still letting the browser personalize the page
after hydration.

In practice, the same cancellation rule applies across component trees:

- a fresher `Component.load()` attempt aborts the older one
- disconnecting the host tree aborts in-flight component loads underneath it
- aborted `AbortError` results stay treated as cancellation, not as a real component error state

## A practical rule

Ask these questions in order:

1. Does the route itself own this data?
2. Or does a nested component own the corresponding sub-tree?

If the route owns it, use `Page.load()`.

If the component owns it, use `Component.load()`.

If the route only needs concrete SSG params, use `entries()` and stop there.

That distinction matters for cancellation too:

- `entries()` is build/prerender work
- `Page.load()` can participate in runtime navigation cancellation
- `Component.load()` already receives a web-native `AbortSignal` for component-owned reloads and cleanup

## `RenderMode(...)` and `RenderStrategy(...)` are still different layers

If the distinction still feels fuzzy, read
[Render Mode and Render Strategy](./render-mode-and-strategy.md).

The short version is:

- `@RenderMode(...)` belongs to the page and defines the route envelope
- `@RenderStrategy(...)` belongs to the component and defines how that component participates inside
  the route
- `Component.load()` is the normal component-owned async path
