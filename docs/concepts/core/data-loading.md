## `entries()` expands static paths

For SSG, a dynamic route needs concrete params. `entries()` gives the build enough information to materialize real paths.

The framework only passes `locale`. Everything else can be loaded directly by the page from files, CMS, or any service reachable at build time.

```tsx title="Docs.page.tsx"
static async entries({ locale }: { locale?: string }) {
  return getDocsForLocale(locale).map((doc) => ({
    params: { slug: doc.slug },
  }));
}
```

## `load()` brings route data to the page

`load()` receives params, locale, URL, renderMode, and navigationMode.

It runs in the runtime path for SPA navigation and also during document-first boot.

```tsx title="Docs.page.tsx"
static async load({ params }: { params: Record<string, string> }) {
  return await fetchDoc(params.slug);
}

override render() {
  const doc = this.props.data;
  return <article>{doc.title}</article>;
}
```

## What this slice covers

The current implementation expands SSG routes with `entries()` and loads runtime data with `load()`.

Passing build-time data from `entries()` directly into prerender output can come later if you want a richer SSG preload story.
