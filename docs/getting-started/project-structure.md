---
title: Project Structure
summary: Organize targets, pages, and content without hiding how the framework works.
---

## Keep the product shape visible

A Mainz app works best when the directory structure reflects the product structure.

Pages should live with the app workspace that owns them. A Mainz workspace does not need a root
`src/` directory; each app can own its own source tree.

```txt title="Suggested workspace structure"
mainz.config.ts
site/
  index.html
  src/
    app.ts
    main.tsx
    pages/
    components/
    lib/
docs/
  index.html
  src/
    app.ts
    main.tsx
    pages/
```

When a target uses routing or shared DI composition, treat the app's `src/app.ts` as the readable composition root and keep `src/main.tsx` small. For simple root-only apps, that extra `app.ts` layer is optional.

Use the CLI to create the first structure:

```bash
mainz app create site
mainz app create docs
```

When you use `defineApp(...)`, give the app a stable unique `id`. Mainz uses that `id` for app-aware diagnostics and commands such as `mainz diagnose --target <name> --app <id>`.

## Avoid hiding routing in helpers

The point is not to eliminate all helpers.

The point is to keep the page model obvious enough that a teammate can open a target and understand how it boots, routes, and builds.
