## Why Mainz

Mainz treats pages as first-class units, so routing, head metadata, build output, and hydration stay
connected.

That means less framework ceremony in `main.tsx` and more of the product model living close to the
page itself.

## Create your first page

A page only needs a route annotation, optional locale metadata, optional page metadata, and a render
method. The framework takes care of registration and head management.

```tsx title="Home.page.tsx"
import { Locales, Page, RenderMode, Route } from "mainz";

@Route("/")
@RenderMode("ssg")
@Locales("en", "pt")
export class HomePage extends Page {
    static override page = {
        head: {
            title: "Hello Mainz",
        },
    };

    override render() {
        return <section>Hello from Mainz</section>;
    }
}
```

`@Route(...)` keeps route metadata on the page, `@RenderMode(...)` declares the route envelope, and
`@Locales(...)` declares locale-specific routing close to the page. `static page` is then free to
stay focused on richer metadata like `head` and `notFound`.

If you want an explicit stable tag instead of the generated class-based one, add
`@CustomElement(...)`. Locale values should be valid BCP 47 tags such as `en`, `pt-BR`, or
`sr-Latn-RS`.

## Bootstrap the app

The app entry stays tiny. You only declare the page set and the notFound page.

```tsx title="main.tsx"
import { startPagesApp } from "mainz";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";

startPagesApp({
    pages: [HomePage],
    notFound: NotFoundPage,
});
```
