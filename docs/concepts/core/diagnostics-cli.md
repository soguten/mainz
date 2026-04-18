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
- pages that reference named authorization policies not declared in `app.authorization.policyNames`
- `Component` declarations with `@RenderStrategy("defer")` but no `load()`
- `Component` declarations with `load()` using `defer` without `placeholder()`
- `Component` declarations using `blocking` together with `placeholder()`, which is usually
  misleading
- `Component` declarations using `@RenderPolicy("placeholder-in-ssg")` without `placeholder()`
- components that reference named authorization policies not declared in
  `app.authorization.policyNames`
- DI registrations and injections that refer to missing services
- service registration cycles

## Declarative policy names for diagnostics

Named authorization policies are implemented at runtime through `auth.policies`, but the CLI does
not execute those runtime policy functions during `mainz diagnose`.

When you use `@Authorize({ policy: "..." })`, declare the allowed policy names in `defineApp(...)`
so diagnostics can validate them statically:

```tsx title="main.tsx"
import { defineApp, startApp } from "mainz";

const app = defineApp({
    id: "site",
    authorization: {
        policyNames: ["org-member", "billing-admin"],
    },
    pages: [HomePage, BillingPage],
});

startApp(app, {
    auth: {
        policies: {
            "org-member": (principal) => principal.claims.orgId === "mainz",
            "billing-admin": (principal) => principal.roles.includes("billing-admin"),
        },
    },
});
```

The app declaration is names-only and powers static diagnostics. The executable policy
implementations still belong in `startApp(app, { auth: { policies } })`.

`mainz diagnose` expects a literal `authorization.policyNames` array on the selected app. Dynamic
policy-name declarations are not statically resolved. Runtime authorization still fails fast if a
protected page or component references a policy that is not registered in `auth.policies`.

## Human output

For direct terminal use, prefer:

```bash
mainz diagnose --target docs --format human
```

The human format:

- prints a diagnostics summary first
- groups diagnostics by target
- groups app-aware diagnostics by app when app definitions are discovered
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

When a target contains multiple app definitions, `mainz diagnose --target <name>` evaluates all of
them in lexicographic order by app `id`.

Example:

```txt
Diagnostics summary: 1 error(s), 0 warning(s)

Target: di-http-site
App: mock-site

error di-token-not-registered
  export: HttpStoriesApi
  file: C:/repo/examples/di-http-site/src/lib/api.ts
  token: HttpClient
  Class "HttpStoriesApi" injects "HttpClient" with mainz/di, but that token is not registered in app startup services.
```

To diagnose only one app within the target, pass its app id explicitly:

```bash
mainz diagnose --target di-http-site --app site --format human
```

If no app candidate is discovered, diagnostics fall back to conventional `pagesDir` discovery. If an
app candidate is discovered but cannot be resolved completely, diagnostics report an app discovery
error instead of silently falling back for that same candidate.

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
 * component-load-missing-placeholder: fixture intentionally omits placeholder UI
 */
@CustomElement("x-owner-tools")
@RenderStrategy("defer")
export class OwnerTools extends Component {
}
```

That suppresses every `component-load-missing-placeholder` diagnostic emitted for that export.

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

If Mainz adds VS Code or LSP integration later, those should reuse the same diagnostics core instead
of inventing a separate rule model.
