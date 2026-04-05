---
title: Diagnostics CLI
summary: Use mainz diagnose in the terminal or CI without tying framework diagnostics to one editor.
---

## diagnostics are framework diagnostics, not editor glue

Mainz ships framework-level diagnostics that you can run from the CLI.

That means diagnostics are not tied to:

- Deno lint
- VS Code
- ESLint
- one specific IDE

Use the CLI directly:

```bash
deno run -A ./src/cli/mainz.ts diagnose
```

or, when Mainz is installed as a command:

```bash
mainz diagnose
```

## What `mainz diagnose` diagnoses today

Today `mainz diagnose` can report checks such as:

- dynamic SSG routes missing `entries()`
- dynamic SSG routes with `entries()` but no `load()`
- invalid `entries()` for dynamic SSG params
- `notFound` pages that are not `ssg`
- app-level `notFound` pages that still define `@Route(...)`
- multiple `notFound` pages in the same routing set
- pages that reference named authorization policies not declared in
  `target.authorization.policyNames`
- `Component` declarations with `@RenderStrategy(...)` but no `load()`
- `Component` declarations with `load()` using `deferred` or `client-only` without a fallback
- `Component` declarations using `blocking` together with a fallback, which is usually misleading
- components that reference named authorization policies not declared in
  `target.authorization.policyNames`
- DI registrations and injections that refer to missing services
- service registration cycles

## Declarative policy names for diagnostics

Named authorization policies are registered at runtime through `auth.policies`, but the CLI does
not execute your app during `mainz diagnose`.

When you use `@Authorize({ policy: "..." })`, declare the allowed policy names in
`mainz.config.ts` so diagnostics can validate them statically:

```ts title="mainz.config.ts"
export default {
    targets: [
        {
            name: "site",
            rootDir: "./site",
            viteConfig: "./vite.config.ts",
            authorization: {
                policyNames: ["org-member", "billing-admin"],
            },
        },
    ],
};
```

That declaration powers diagnostics tooling only. Your real policy implementations still belong in
`startApp(app, { auth: { policies } })` or `startNavigation({ auth: { policies } })`.

## Human output

For direct terminal use, prefer:

```bash
mainz diagnose --target docs --format human
```

The human format:

- prints a diagnostics summary first
- groups diagnostics by target
- keeps each diagnostic easy to scan in the terminal

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

## Diagnostic suppression comments

When one page or component intentionally needs a local escape hatch, Mainz diagnostics support a
tooling-only suppression comment attached to the exported declaration.

Place the comment:

- above the first decorator when the export has decorators
- or directly above the exported declaration when it does not

Owner-wide suppression:

```ts
/**
 * @mainz-diagnostics-ignore
 * component-load-missing-fallback: fixture intentionally omits fallback UI
 */
@CustomElement("x-owner-tools")
@RenderStrategy("client-only")
export class OwnerTools extends Component {
}
```

That suppresses every `component-load-missing-fallback` diagnostic emitted for that export.

Subject-specific suppression:

```ts
/**
 * @mainz-diagnostics-ignore
 * invalid-locale-tag[locale=pt_BR]: legacy locale value kept for migration coverage
 */
@Locales("pt_BR", "en_US")
export class SearchPage extends Page {
}
```

That suppresses only the matching semantic occurrence.

When you need more than one subject, repeat the diagnostic code once per subject:

```ts
/**
 * @mainz-diagnostics-ignore
 * di-token-not-registered[token=StoriesApi]: fixture keeps this legacy token unresolved on purpose
 * di-token-not-registered[token=HttpClient]: external mock wiring still depends on this token shape
 */
export class StoriesPage extends Page {
}
```

Today subject-aware diagnostics include cases such as:

- invalid locale tags with `locale=<locale>`
- invalid dynamic SSG entries with `entry=<index>` or `entry=<index>;locale=<locale>`
- missing DI registrations for one injected token with `token=<token-name>`
- missing DI registrations for one service dependency with `dependency=<token-name>`

Suppression validation is diagnostic-aware:

- unknown suppression codes warn
- malformed or unsupported subjects warn
- duplicate `code + subject` entries warn
- unused suppressions warn

If a suppression omits `subject`, it applies to all subjects of that code for the same owner.

## CI usage

The same command can fail the process when diagnostics cross a threshold.

Fail on errors only:

```bash
mainz diagnose --target docs --format human --fail-on error
```

Fail on any diagnostics, including warnings:

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


