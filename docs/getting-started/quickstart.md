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
  override metadata() {
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
the page. The page instance then owns `load()`, `metadata()`, and `render()` for
each concrete route.

If you want an explicit stable tag instead of the generated class-based one, add
`@CustomElement(...)`. Locale values should be valid BCP 47 tags such as `en`,
`pt-BR`, or `sr-Latn-RS`.

## Bootstrap the app

The app entry stays tiny. Define the routed app once, then start it.

```tsx title="app.ts"
import { defineApp } from "mainz";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";

export const app = defineApp({
  id: "site",
  i18n: {
    locales: ["en", "pt"],
    defaultLocale: "en",
    localePrefix: "except-default",
    dictionaries: {
      en: {
        hero: {
          title: "Hello Mainz",
        },
      },
      pt: {
        hero: {
          title: "Ola Mainz",
        },
      },
    },
  },
  pages: [HomePage],
  notFound: NotFoundPage,
});
```

```tsx title="main.tsx"
import { startApp } from "mainz";
import { app } from "./app.ts";

startApp(app);
```

For predictable UI copy, consume the framework-owned translation runtime from
`mainz/i18n`:

```tsx title="Hero.tsx"
import { t } from "mainz/i18n";

export function Hero() {
  return <h1>{t("hero.title")}</h1>;
}
```

If your content already comes from a CMS, database, or markdown collection,
keep using `entries()` and `load({ locale })` to fetch it directly in the
correct locale instead of forcing that content into dictionaries.

For the deeper split between app definition, static consumers such as
build/diagnostics, and runtime startup, see
[App Definition](../concepts/core/app-definition.md).

