## Two different decisions

Mainz separates render mode from navigation mode. Render answers how HTML exists; navigation answers
how links move between pages.

That gives you combinations like **SSG + MPA**, **SSG + enhanced-MPA**, and **CSR + SPA** without
overloading a single flag.

## Keep the app API small

The page app should not parse URLs, define custom elements, or manually resolve the initial route.

The runtime already knows mode, basePath, locales, and hydration strategy from the build context.

> That is why Mainz now prefers `startPagesApp()` over leaking infrastructure details into
> application bootstrap.

## Profiles versus combinations

Profiles like `dev`, `production`, and `gh-pages` still matter, but they should not hide the core
matrix you actually want to test.

```bash title="CLI"
deno run -A ./src/cli/mainz.ts build --target site --mode ssg --navigation enhanced-mpa

deno run -A ./src/cli/mainz.ts build --target site --mode csr --navigation spa
```
