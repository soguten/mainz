## A page is the center of gravity

In Mainz, a page owns the route metadata that matters to that page.

That includes path, render mode, locales, and head information.

```tsx title="Page contract"
export class HomePage extends Page {
  static override page = {
    path: "/",
    mode: "ssg" as const,
    head: {
      title: "Home",
    },
  };
}
```

## Keep behavior near the page

That same page can also define `entries()` and `load()` when a dynamic route needs it.

The framework then expands and bootstraps the route without requiring a separate router file full of glue code.
