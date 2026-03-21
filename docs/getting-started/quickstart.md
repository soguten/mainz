## Why Mainz

Mainz treats pages as first-class units, so routing, head metadata, build output, and hydration stay
connected.

That means less framework ceremony in `main.tsx` and more of the product model living close to the
page itself.

## Create your first page

A page only needs a route annotation, a custom element name, optional static metadata, and a render
method. The framework takes care of registration and head management.

```tsx title="Home.page.tsx"
import { CustomElement, Page, RenderMode, Route } from "mainz";

@CustomElement("app-home-page")
@Route("/")
@RenderMode("ssg")
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
`@CustomElement(...)` remains the single source of truth for the generated web component name.

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
