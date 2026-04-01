## Dependency injection stays infrastructure-scoped

Mainz now includes a small official DI model for infrastructure services.

The repository also includes a working example in `examples/di-http-site`.

Use it for things like:

- HTTP clients
- API gateways
- logging
- feature flags
- environment-aware adapters

Do not use it to hide page ownership, route params, or semantic component input.

Mainz keeps those contracts explicit:

- route data still belongs in `Page.load()`
- component-owned async work still belongs in `Component.load()`
- `props` still carry semantic input

## Register services at startup

Service registration belongs at app startup through the official app definition. Routed apps should prefer `defineApp(...)`; `startNavigation(...)` remains the lower-level escape hatch when you need to wire navigation directly.

```ts title="main.ts"
import { defineApp, startApp } from "mainz";
import { inject, singleton } from "mainz/di";
import { HttpClient } from "mainz/http";
import { ArticlePage } from "./pages/Article.page.tsx";

class ArticlesApi {
    private readonly http = inject(HttpClient);

    async getBySlug(slug: string, options?: { signal?: AbortSignal }) {
        return await this.http.get(`/articles/${slug}`, {
            signal: options?.signal,
        }).json<{ title: string }>();
    }
}

const app = defineApp({
    pages: [ArticlePage],
    services: [
        singleton(HttpClient, () =>
            new HttpClient({
                baseUrl: "https://api.example.com",
                retry: {
                    attempts: 2,
                    delayMs: 150,
                },
            })),
        singleton(ArticlesApi),
    ],
});

startApp(app);
```

`singleton(...)` is scoped per started app root.

That means two separate Mainz apps on the same document can register different implementations for
the same token without leaking instances across roots.

## Resolve services with `inject(Token)`

Pages and components use the same `inject(Token)` shape:

```tsx title="Article.page.tsx"
import { Page, type PageLoadContext, Route } from "mainz";
import { inject } from "mainz/di";

@Route("/articles/:slug")
export class ArticlePage extends Page {
    private readonly api = inject(ArticlesApi);

    override async load({ signal }: PageLoadContext) {
        return await this.api.getBySlug(this.route.params.slug, { signal });
    }
}
```

```tsx title="ArticlePanel.tsx"
import { Component, type ComponentLoadContext, type NoState, RenderStrategy } from "mainz";
import { inject } from "mainz/di";

@RenderStrategy("blocking")
export class ArticlePanel extends Component<{ slug: string }, NoState, { title: string }>{

    private readonly api = inject(ArticlesApi);

    override load(context: ComponentLoadContext) {
        return this.api.getBySlug(this.props.slug, {
            signal: context.signal,
        });
    }
}
```

The split stays clean:

- `params.slug` or `props.slug` are still semantic input
- the resolved service handles infrastructure access
- `signal` still flows explicitly through the async boundary

That same app definition now also drives build-time DI for official expansion hooks like `entries()`, so route expansion and runtime owners resolve against the same registered service set.

## `mainz/http` is intentionally small

`mainz/http` provides a compact client for common app work:

- `get/post/put/patch/delete`
- `json<T>()`
- `text()`
- `blob()`
- base URL support
- default headers
- `signal`
- timeout support
- small conservative retry behavior

```ts title="ArticlesApi.ts"
import { inject } from "mainz/di";
import { HttpClient } from "mainz/http";

export class ArticlesApi {
    private readonly http = inject(HttpClient);

    async getBySlug(slug: string, options?: { signal?: AbortSignal }) {
        return await this.http.get(`/articles/${slug}`, {
            signal: options?.signal,
        }).json<{ title: string; body: string }>();
    }
}
```

If the request fails with a non-success status, `HttpClient` throws by default.

## Keep DI secondary to the Mainz mental model

DI is there to remove infrastructure plumbing from `props`, not to replace Mainz's ownership-first
model.

Reach for it when the dependency is cross-cutting infrastructure.

Keep using:

- `Page.load()` for route-owned data
- `Component.load()` for component-owned async work
- `props` for semantic inputs from parents or the route

That keeps service access ergonomic without turning Mainz into a generic container-first framework.
