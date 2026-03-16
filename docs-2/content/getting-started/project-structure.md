## Keep the product shape visible

A Mainz app works best when the directory structure reflects the product structure.

Pages live under the target, build config lives with the target, and app-specific content can stay alongside the app itself.

```tsx title="Suggested layout"
docs-2/
  content/
  src/
    pages/
    components/
    lib/
  mainz.build.ts
```

## Avoid hiding routing in helpers

The point is not to eliminate all helpers.

The point is to keep the page model obvious enough that a teammate can open a target and understand how it boots, routes, and builds.
