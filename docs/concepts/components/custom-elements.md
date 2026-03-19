## Stable tags belong to the class

Mainz pages and components are Web Components, so each class eventually needs a tag name.

When you want that tag to be explicit and stable, use `@CustomElement(...)`.

```tsx title="HeroCard.tsx"
import { Component, CustomElement } from "mainz";

@CustomElement("app-hero-card")
export class HeroCard extends Component {
    override render() {
        return <article>Hero</article>;
    }
}
```

## One place defines the explicit tag

`@CustomElement(...)` is the single explicit source of truth for the registered tag name.

That keeps the name close to the class, avoids duplicated configuration, and makes
hydration-sensitive pages easier to reason about.

Pages use the same pattern:

```tsx title="Home.page.tsx"
import { CustomElement, Page, Route } from "mainz";

@CustomElement("app-home-page")
@Route("/")
export class HomePage extends Page {
    override render() {
        return <section>Home</section>;
    }
}
```

## Generated tags still exist when needed

If you omit `@CustomElement(...)`, Mainz can still generate a tag from the class name.

That is useful for quick experiments, but explicit tags are the better choice when a page or
component needs long-term stability across SSG, hydration, refactors, or minification-sensitive
builds.

## Tag rules stay close to platform rules

A valid custom element name must contain a hyphen, so names like `app-home-page` or
`ui-language-switcher` work well.

If two classes still collide on the same generated name, Mainz resolves the conflict by suffixing
later registrations.

That fallback helps in development, but explicit `@CustomElement(...)` names are the clearest option
for framework docs, production pages, and shared components.
