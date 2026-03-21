## A page is the center of gravity

In Mainz, a page owns the metadata that matters to that page.

That includes the route annotation, the custom element name, plus render mode, locales, and head
information.

```tsx title="Page contract"
import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";

@CustomElement("app-home-page")
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

The split is intentional: `@Route(...)` describes where the page lives, and `@CustomElement(...)`
defines the stable tag the runtime registers. `@RenderMode(...)` and `@Locales(...)` declare the
route contract up front, while `static page` stays focused on richer metadata like `head` and
`notFound`.

That keeps the high-signal routing decisions visible before you read the class body.

When the page renders async components, those components use `@RenderStrategy(...)` to decide
whether they block, defer, or wait for the browser. See
[Render Mode and Render Strategy](../core/render-mode-and-strategy.md) for the full matrix.

## Keep behavior near the page

That same page can also define `entries()` and `load()` when a dynamic route needs it.

The framework then expands and bootstraps the route without requiring a separate router file full of
glue code.
