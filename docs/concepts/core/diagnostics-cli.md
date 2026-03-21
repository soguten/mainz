## Diagnostics live in Mainz, not in one editor

Mainz now ships an environment-agnostic diagnostics core plus a CLI adapter.

That means the rule engine is not tied to:

- Deno lint
- VS Code
- ESLint
- one specific IDE

The current entrypoint is the CLI:

```bash
deno run -A ./src/cli/mainz.ts diagnose
```

or, when Mainz is installed as a command:

```bash
mainz diagnose
```

## What `mainz diagnose` checks today

Route diagnostics:

- pages that rely on the implicit `csr` default instead of declaring `@RenderMode(...)`
- dynamic SSG routes missing `entries()`
- dynamic SSG routes with `entries()` but no `load()`
- invalid `entries()` for dynamic SSG params
- `notFound` pages that are not `ssg`
- multiple `notFound` pages in the same routing set

Component diagnostics:

- `Component` owners that render `ComponentResource` without `@RenderStrategy(...)`
- `Component` owners that render `ComponentResource` with `deferred` or `client-only` but no
  fallback
- `Component` owners that render `ComponentResource` with `blocking` and a locally declared
  `private` or `client` resource that will fail if they enter an SSG path
- `Component` owners that render `ComponentResource` with `blocking` and a locally declared
  resource that omits `visibility`, because the default is still conservative and therefore
  effectively private for SSG safety
- `ResourceComponent` declarations missing `@RenderStrategy(...)`
- `ResourceComponent` declarations using `deferred` or `client-only` without a fallback
- `ResourceComponent` declarations using `blocking` with `private` or `client` resources that will break if they enter an SSG path

## Human output

For direct terminal use, prefer:

```bash
mainz diagnose --target docs --format human
```

The human format:

- prints a summary first
- groups findings by target
- keeps each finding easy to scan in the terminal

Example:

```txt
Diagnostics summary: 3 error(s), 7 warning(s)

Target: docs

error dynamic-ssg-missing-entries
  export: DocsPage
  file: C:/repo/docs-site/src/pages/Docs.page.tsx
  route: /docs/:slug
  SSG route "/docs/:slug" must define entries() to expand dynamic params.
```

## JSON output

For automation, use:

```bash
mainz diagnose --target docs --format json
```

That keeps the output machine-readable for:

- CI
- custom scripts
- future editor adapters

## CI usage

The same command can fail the process when findings cross a threshold.

Fail on errors only:

```bash
mainz diagnose --target docs --format human --fail-on error
```

Fail on any diagnostic, including warnings:

```bash
mainz diagnose --target docs --format human --fail-on warning
```

Supported values:

- `never`
- `error`
- `warning`

## Why CLI first

Mainz intentionally starts with the CLI because it gives you:

- one portable adapter
- one rule engine
- one place to use in local development and CI

If Mainz adds VS Code or LSP integration later, those should reuse the same diagnostics core
instead of inventing a separate rule model.
