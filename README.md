# mainz

A class-based TSX runtime built on Web Components.

Mainz is for page-first apps where routing, page metadata, async loading, and hydration should stay close to the class that owns them.

The model is intentionally small:

- `Component` owns reusable UI
- `Page` extends that model with route concerns
- `load()` owns async data
- `render()` stays synchronous

## Start with a component

A Mainz component is just a class with props, optional state, and `render()`.

```tsx
import { Component, type NoProps } from "mainz";

interface CounterState {
    count: number;
}

export class CounterCard extends Component<NoProps, CounterState> {
    protected override initState() {
        return { count: 0 };
    }

    override render() {
        return <button>{String(this.state.count)}</button>;
    }
}
```

When a component owns async work, add `load()`.

When a component declares `load()`, Mainz treats `blocking` as the default rendering strategy.

```tsx
import { Component, type NoState } from "mainz";

interface Product {
    title: string;
}

export class ProductPanel extends Component<{ slug: string }, NoState, Product> {
    override async load() {
        return await getProduct(this.props.slug);
    }

    override render(data: Product) {
        return <article>{data.title}</article>;
    }
}
```

If the same component also provides `placeholder()`, Mainz can infer a deferred loading shape:

```tsx
import { Component, type NoState } from "mainz";

interface Product {
    title: string;
}

export class ProductPanel extends Component<{ slug: string }, NoState, Product> {
    override async load() {
        return await getProduct(this.props.slug);
    }

    override placeholder() {
        return <p>Loading product...</p>;
    }

    override render(data: Product) {
        return <article>{data.title}</article>;
    }
}
```

`@RenderStrategy(...)` is there when you want that behavior to be explicit.

## A page is just a route-owning component

`Page` keeps the same class model, but adds route metadata and page concerns like `head()`.

```tsx
import { Page, Route } from "mainz";

@Route("/")
export class HomePage extends Page {
    override head() {
        return {
            title: "Hello Mainz",
        };
    }

    override render() {
        return <section>Hello from Mainz</section>;
    }
}
```

A page owns:

- route metadata
- route params
- page data
- document head
- visible output

By default, pages use `csr`.

That means the route is rendered on the client unless the page explicitly opts into static output.

When a route should be prerendered as static HTML, add `@RenderMode("ssg")`:

```tsx
import { Page, RenderMode, Route } from "mainz";

@Route("/about")
@RenderMode("ssg")
export class AboutPage extends Page {
    override render() {
        return <section>About</section>;
    }
}
```

If the SSG route is dynamic, `entries()` expands the concrete params that should exist at build time:

```tsx
import { Page, RenderMode, Route } from "mainz";

@Route("/docs/:slug")
@RenderMode("ssg")
export class DocsPage extends Page<{}, {}, { title: string }> {
    static entries() {
        return docs.map((doc) => ({
            params: { slug: doc.slug },
        }));
    }

    override async load() {
        return await fetchDoc(this.route.params.slug);
    }

    override head() {
        return {
            title: this.data.title,
        };
    }

    override render(data: { title: string }) {
        return <article>{data.title}</article>;
    }
}
```

## App definition keeps navigation separate from rendering

Pages own render concerns like `csr` or `ssg`.

Navigation is an app-level concern, configured through `defineApp(...)`.

```tsx
import { defineApp, startApp } from "mainz";
import { DocsPage } from "./pages/Docs.page.tsx";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";

const app = defineApp({
    pages: [HomePage, DocsPage],
    notFound: NotFoundPage,
    navigation: "spa",
});

startApp(app);
```

Mainz keeps those decisions separate on purpose:

- `@RenderMode(...)` answers how a page is rendered
- `defineApp({ navigation })` answers how links move between pages

Navigation can be configured as:

- `spa`
- `mpa`
- `enhanced-mpa`

## Dependency injection stays infrastructure-scoped

Use DI for infrastructure like HTTP clients, API gateways, logging, and feature flags.

```tsx
import { defineApp, startApp } from "mainz";
import { inject, singleton } from "mainz/di";
import { HttpClient } from "mainz/http";

class ArticlesApi {
    private readonly http = inject(HttpClient);

    async getBySlug(slug: string) {
        return await this.http.get(`/articles/${slug}`).json<{ title: string }>();
    }
}

const app = defineApp({
    pages: [HomePage],
    services: [
        singleton(HttpClient),
        singleton(ArticlesApi),
    ],
});

startApp(app);
```

DI does not replace page ownership, component ownership, or semantic props.

## Authorization stays on the owner too

Pages and components can declare authorization metadata with decorators such as:

- `@Authorize()`
- `@Authorize({ roles: [...] })`
- `@Authorize({ policy: "..." })`
- `@AllowAnonymous()`

That same metadata is reusable by runtime enforcement, navigation visibility, and diagnostics.

## CLI

Mainz also ships with a CLI for building apps, previewing artifacts, and validating route and framework contracts.

The most useful command is `diagnose`.

```bash
mainz diagnose
```

`mainz diagnose` can catch issues such as:

- invalid route metadata
- unsupported page lifecycle shapes
- missing authorization policy names
- SSG-incompatible ownership patterns
- route expansion problems in `entries()`

That makes it useful both in local development and in CI.

## Examples

- [`examples/authorize-site`](./examples/authorize-site)
  Authorization on pages and components with route visibility derived from the same metadata.
- [`examples/di-http-site`](./examples/di-http-site)
  DI, HTTP clients, service replacement, and async page/component loading.

## Docs

- [`docs/getting-started/installation.md`](./docs/getting-started/installation.md)
- [`docs/getting-started/quickstart.md`](./docs/getting-started/quickstart.md)
- [`docs/concepts/core/routing.md`](./docs/concepts/core/routing.md)
- [`docs/concepts/core/data-loading.md`](./docs/concepts/core/data-loading.md)
- [`docs/concepts/core/dependency-injection.md`](./docs/concepts/core/dependency-injection.md)
- [`docs/concepts/core/authorization.md`](./docs/concepts/core/authorization.md)
- [`docs/concepts/testing/overview.md`](./docs/concepts/testing/overview.md)
