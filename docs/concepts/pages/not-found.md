## 404 is part of the app model

A custom `NotFoundPage` should feel like a real page in the product, not a generic server fallback.

That means it keeps the same layout, the same theme system, and the same localized navigation affordances.

## Different runtime, same idea

In SPA mode the client runtime owns the fallback behavior.

In SSG plus document-first modes, Mainz also emits `404.html` so preview and static hosting can serve the custom page correctly.

Register the page through `defineApp({ notFound: NotFoundPage })`.

`NotFoundPage` should not define `@Route(...)`; the fallback is an app concern, not a normal route declaration.
