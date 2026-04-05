---
title: Project Structure
summary: Organize targets, pages, and content without hiding how the framework works.
---

## Keep the product shape visible

A Mainz app works best when the directory structure reflects the product structure.

Pages should live with the target that owns them, and the target build config should stay close to
that app.

```txt title="Suggested routed app structure"
src/
  main.tsx
  app.ts
  pages/
  components/
  lib/
mainz.build.ts
```

When a target uses routing or shared DI composition, treat `src/app.ts` as the readable
composition root and keep `src/main.tsx` small. For simple root-only apps, that extra `app.ts`
layer is optional.

## Avoid hiding routing in helpers

The point is not to eliminate all helpers.

The point is to keep the page model obvious enough that a teammate can open a target and understand how it boots, routes, and builds.
