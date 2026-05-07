---
title: Quickstart
summary: Start with a page-first app, ship static HTML, and keep hydration predictable.
---

## Why Mainz

Mainz treats pages as first-class units, so routing, head metadata, build
output, and hydration stay connected.

That means less framework ceremony in `main.tsx` and more of the product model
living close to the page itself.

## Create your first page

A page only needs a route annotation, optional locale metadata, optional page
metadata, and a render method. The framework takes care of registration and head
management.

```tsx title="Home.page.tsx"
import { Locales, Page, RenderMode, Route } from "mainz";

@Route("/")
@RenderMode("ssg")
@Locales("en", "pt")
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

`@Route(...)` keeps route metadata on the page, `@RenderMode(...)` declares the
route envelope, and `@Locales(...)` declares locale-specific routing close to
the page. The page instance then owns `load()`, `head()`, and `render()` for
each concrete route.

If you want an explicit stable tag instead of the generated class-based one, add
`@CustomElement(...)`. Locale values should be valid BCP 47 tags such as `en`,
`pt-BR`, or `sr-Latn-RS`.

## Bootstrap the app

The app entry stays tiny. Define the routed app once, then start it.

```tsx title="main.tsx"
import { defineApp, startApp } from "mainz";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";

const app = defineApp({
  pages: [HomePage],
  notFound: NotFoundPage,
});

startApp(app);
```

For the deeper split between app definition, static consumers such as
build/diagnostics, and runtime startup, see
[App Definition](../concepts/core/app-definition.md).
