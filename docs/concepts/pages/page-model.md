## A page is the center of gravity

In Mainz, a page owns the metadata that matters to that page.

That includes the route annotation, render mode, locales, authorization, head information, and any
optional explicit custom element name.

```tsx title="Page contract"
import { Locales, Page, RenderMode, Route } from "mainz";

@Route("/")
@RenderMode("ssg")
@Locales("en", "pt")
export class HomePage extends Page {
    
    static override page = {
        head: {
            title: "Home",
        },
    };
}
```

The split is intentional: `@Route(...)` describes where the page lives, while `@RenderMode(...)` and `@Locales(...)` declare the route contract up front. `static page` then stays focused on richer
metadata like `head` and `notFound`.

When access control belongs to the route itself, keep that on the page too with `@Authorize(...)`
or `@AllowAnonymous()`. See [Authorization](../core/authorization.md) for the runtime model.

When a page needs infrastructure such as an API client or logger, resolve that through `mainz/di` with `inject(Token)` instead of threading it through `props`. See [Dependency Injection](../core/dependency-injection.md).

When you want an explicit stable tag instead of the generated class-based one, add
`@CustomElement(...)`. 

Locale values should be valid BCP 47 tags such as `en`, `pt-BR`, or `sr-Latn-RS`.

That keeps the high-signal routing decisions visible before you read the class body.

When the page renders async components, those components use `@RenderStrategy(...)` to decide
whether they block, defer, or wait for the browser. See [Render Mode and Render Strategy](../core/render-mode-and-strategy.md) for the full matrix.

## Keep behavior near the page

That same page can also define `entries()` and `load()` when a dynamic route needs it.

The framework then expands and bootstraps the route without requiring a separate router file full of
glue code.

When a page defines `load()`, the context now includes `signal: AbortSignal`.

That signal represents the lifetime of the current managed navigation in the runtime. If Mainz
supersedes or aborts that navigation, the signal is aborted so the page can stop route-owned async
work and avoid stale updates.

This is specifically about runtime navigation.

`entries()` still belongs to build/prerender route expansion and is not part of the `navigationabort` lifecycle.
