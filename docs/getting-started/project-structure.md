## Keep the product shape visible

A Mainz app works best when the directory structure reflects the product structure.

Pages live under the target, build config lives with the target, and docs content can stay separate from the app that renders it.

```tsx title="Suggested layout"
site/
  src/
docs/
  getting-started/
  concepts/
  advanced/
docs-site/
  src/
    pages/
    components/
    lib/
  mainz.build.ts
```

## Avoid hiding routing in helpers

The point is not to eliminate all helpers.

The point is to keep the page model obvious enough that a teammate can open a target and understand how it boots, routes, and builds.
