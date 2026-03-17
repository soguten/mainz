## A page is the center of gravity

In Mainz, a page owns the metadata that matters to that page.

That includes the route annotation, the custom element name, plus render mode, locales, and head
information.

```tsx title="Page contract"
import { customElement, Page, route } from "mainz";

@customElement("app-home-page")
@route("/")
export class HomePage extends Page {
    static override page = {
        mode: "ssg" as const,
        head: {
            title: "Home",
        },
    };
}
```

The split is intentional: `@route(...)` describes where the page lives, and `@customElement(...)`
defines the stable tag the runtime registers.

## Keep behavior near the page

That same page can also define `entries()` and `load()` when a dynamic route needs it.

The framework then expands and bootstraps the route without requiring a separate router file full of
glue code.
