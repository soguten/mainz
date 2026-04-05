---
title: Routing Modes
summary: Separate render from navigation and choose the combination that matches the product.
---

## Two different decisions

Mainz separates render mode from navigation mode. Render answers how HTML exists; navigation answers
how links move between pages.

That gives you combinations like **SSG + MPA**, **SSG + enhanced-MPA**, and **CSR + SPA** without
overloading a single flag.

## Keep the app API small

The page app should not parse URLs, define custom elements, or manually resolve the initial route.

The runtime already knows mode, basePath, locales, and hydration strategy from the build context.

> That is why Mainz now prefers `startApp()` over leaking infrastructure details into
> application bootstrap.

## Profiles versus combinations

Profiles like `dev`, `production`, and `gh-pages` still matter, but render selection is now page-owned instead of controlled through a public CLI `--mode` flag.

```bash title="CLI"
deno run -A ./src/cli/mainz.ts build --target site --profile production

deno run -A ./src/cli/mainz.ts build --target site --profile gh-pages
```

In production builds:

- `@RenderMode(...)` on the page is the source of truth
- undecorated pages default to `csr`
- navigation can still vary by profile or explicit CLI selection where supported
