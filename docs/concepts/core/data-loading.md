## `entries()` expands static paths

For SSG, a dynamic route needs concrete params. `entries()` gives the build enough information to materialize real paths.

The framework only passes `locale`. Everything else can be loaded directly by the page from files, CMS, or any service reachable at build time.

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

## `load()` is still available for route-blocking data

`load()` receives params, locale, URL, renderMode, and navigationMode.

It runs in the runtime path for SPA navigation and also during document-first boot.

```tsx title="Docs.page.tsx"
static load = load.byParam("slug", async (slug) => {
  return await fetchDoc(slug);
});

override render() {
  const doc = this.props.data;
  return <article>{doc.title}</article>;
}
```

Use `load()` when the page itself truly owns route-blocking data.

## Components can now assemble the page body

When the page only needs to declare the route and enumerate SSG outputs, a component can own the
resource read and its render strategy.

For the full model behind `defineResource(...)` and `ComponentResource`, see
[Resource Model](./resource-model.md).

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

## `client-only` components keep browser-local state out of SSG

Use `client-only` when the data depends on browser-only or user-specific state.

```tsx title="RecentlyViewedDocs.tsx"
const recentlyViewedDocsResource = defineResource({
  name: "recent-docs",
  visibility: "private",
  execution: "client",
  cache: "no-store",
  key: ({ currentSlug }) => ["recent-docs", currentSlug ?? null],
  load: ({ currentSlug }) => readRecentDocsFromLocalStorage(currentSlug),
});

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

This keeps the SSG HTML shared and deterministic while still letting the browser personalize the
page after hydration.

For the larger architectural pattern, see
[Public Shell, Private Island](./public-shell-private-island.md).

## `RenderMode(...)` and `RenderStrategy(...)` are different layers

If the distinction still feels fuzzy, read [Render Mode and Render Strategy](./render-mode-and-strategy.md).

The short version is:

- `@RenderMode(...)` belongs to the page and defines the route envelope
- `@RenderStrategy(...)` belongs to the component and defines how that component participates inside the route
- `ComponentResource` is the primitive that resolves the component's data

## What this slice covers

The current implementation expands SSG routes with `entries()`, keeps `load()` for route-blocking
data, and also allows component-driven assembly through `@RenderStrategy(...)` plus
`ComponentResource`.

Passing build-time data from `entries()` directly into prerender output can come later if you want a richer SSG preload story.
