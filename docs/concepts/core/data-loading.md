## Route expansion, route data, and component loading

Mainz now treats async loading as an ownership question.

- `entries()` belongs to the page because route expansion is a page concern
- `Page.load()` belongs to the page when the route itself owns the data
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

## `Page.load()` is for route-owned data

Use `Page.load()` when the page itself owns the data contract.

Typical examples:

- head metadata
- route-level entity identity
- route data the page must know before it can define its output

```tsx title="Docs.page.tsx"
@Route("/docs/:slug")
@RenderMode("ssg")
export class DocsPage extends Page {
    static entries = entries.from(docs, (doc) => ({
        slug: doc.slug,
    }));

    static load = load.byParam("slug", async (slug) => {
        return {
            head: await fetchDocHead(slug),
        };
    });

    override render() {
        const slug = this.props.route?.params?.slug;
        return <DocsArticleContent slug={slug} />;
    }
}
```

Use `Page.load()` when the route owns the answer.

## `Component.load()` is for component-owned async assembly

When the page only needs to declare the route and maybe expand SSG outputs, the component can own
the async assembly directly.

This is now the main user-facing async path in Mainz:

- `Component`
- `@RenderStrategy(...)`
- `Component.load()`

When a loaded component has no local state, use `NoState` in the second generic slot:

- `Component<Props, NoState, Data>`

```tsx title="Docs.page.tsx"
@Route("/docs/:slug")
@RenderMode("ssg")
export class DocsPage extends Page<{ route?: { params?: Record<string, string> } }> {
    static entries = entries.from(docs, (doc) => ({
        slug: doc.slug,
    }));

    override render() {
        return <DocsArticleContent slug={this.props.route?.params?.slug} />;
    }
}
```

```tsx title="DocsArticleContent.tsx"
@RenderStrategy("blocking")
export class DocsArticleContent extends Component<{ slug?: string }, NoState, DocsPageModel> {
    override async load() {
        return buildDocsArticlePageModel(this.props.slug);
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

## `this.data` is the resolved component value

When a component declares `load()`, Mainz exposes the resolved value through `this.data`.

That means:

- `load()` stays the async hook
- `render()` stays synchronous
- the component reads its own resolved value directly from `this.data`

```tsx
@RenderStrategy("blocking")
export class ProductDetails extends Component<{ slug: string }, NoState, Product> {
    override async load() {
        return await getProduct(this.props.slug);
    }

    override render() {
        return <article>{this.data.title}</article>;
    }
}
```

## `@RenderStrategy(...)` now applies to `Component.load()`

`@RenderStrategy(...)` stays a component concern, but it now describes how `Component.load()`
participates in rendering.

### `blocking`

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

## Example: `deferred`

```tsx title="OnThisPage.tsx"
@RenderStrategy("deferred", {
    fallback: () => <p>Scanning sections...</p>,
})
export class OnThisPage extends Component<{ slug?: string }, NoState, readonly Heading[]> {
    override async load() {
        return collectArticleHeadings();
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
    override async load() {
        return readRecentDocsFromLocalStorage(this.props.currentSlug);
    }

    override render() {
        return <RecentDocsNav items={this.data} />;
    }
}
```

This keeps SSG HTML shared and deterministic while still letting the browser personalize the page
after hydration.

## A practical rule

Ask these questions in order:

1. Does the route itself own this data?
2. Or does a nested component own the corresponding sub-tree?

If the route owns it, use `Page.load()`.

If the component owns it, use `Component.load()`.

If the route only needs concrete SSG params, use `entries()` and stop there.

## `RenderMode(...)` and `RenderStrategy(...)` are still different layers

If the distinction still feels fuzzy, read
[Render Mode and Render Strategy](./render-mode-and-strategy.md).

The short version is:

- `@RenderMode(...)` belongs to the page and defines the route envelope
- `@RenderStrategy(...)` belongs to the component and defines how that component participates inside
  the route
- `Component.load()` is the normal component-owned async path
