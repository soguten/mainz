---
title: E2E and Smoke Testing
summary: Use explicit targets and profiles to drive predictable smoke and browser-level testing.
---

## Mainz helps E2E by making build inputs explicit

Mainz does not ship its own browser E2E framework.

Instead, it tries to make E2E and smoke testing predictable by exposing the dimensions that matter
through the CLI:

- `--target`
- `--profile`

That makes it easier to run external tools like Playwright or Cypress against meaningful
combinations.

## Smoke tests versus E2E tests

A useful split is:

- smoke tests: smaller checks against real apps to confirm the product still boots and behaves
- E2E tests: broader checks that validate build output, routing, hydration, SEO, and preview

Mainz supports both styles well because build and runtime choices are explicit instead of hidden in
one overloaded flag.

## Example build commands

```bash title="CLI"
deno run -A ./src/cli/mainz.ts build --target site --profile production
deno run -A ./src/cli/mainz.ts build --target site --profile gh-pages
deno run -A ./src/cli/mainz.ts build --target docs --profile production
```

These commands make the target and publication profile obvious in CI logs and local debugging, while render ownership stays with each page through `@RenderMode(...)`.

## What Mainz makes easier for E2E suites

Even without shipping a browser runner, the framework helps with common E2E pain points:

- navigation mode is app-owned
- targets are explicit
- profile-specific output is explicit
- localized routes and route shells are generated deterministically

That means your E2E suite can ask better questions, such as:

- does a page-owned `ssg` route preserve head tags under `enhanced-mpa`?
- does a default-`csr` route redirect the root locale correctly under `spa`?
- does publication with `basePath` emit the right routing behavior?
- does publication with `siteUrl` emit the right absolute SEO links?

## A practical smoke-test strategy

For app-level smoke coverage, a good default is:

1. build the real app with one meaningful combination
2. preview or open the emitted output
3. verify a small number of critical journeys

Examples:

- the home page renders
- a localized route loads
- notFound works
- one interactive surface hydrates

## A practical E2E strategy

For broader E2E coverage:

1. identify the build combinations that matter
2. group assertions by shared build shape when possible
3. keep special cases separate when their setup differs
4. keep smoke coverage for real apps

That is the same philosophy used internally by the Mainz repository itself.

## Static artifact checks versus booted-runtime checks

A useful split for build-oriented E2E coverage is:

- static artifact checks: read emitted HTML directly when the contract is about publication output
- booted-runtime checks: execute the built client runtime when the contract is about hydration,
  navigation, or post-boot head/body behavior

Use static artifact checks for things like:

- canonical links
- alternate links
- emitted redirects
- file layout under `basePath`

Use booted-runtime checks for things like:

- hydration continuity
- locale-aware navigation
- runtime title or head updates
- interactive route behavior after boot

For booted-runtime checks, prefer synchronizing on `waitForNavigationReady(...)` from
`mainz/testing` or on the bubbled `mainz:navigationready` event before asserting title, locale,
body, or head behavior.

## Public surface versus internal test architecture

As a framework user, the public part you rely on is:

- the `mainz/testing` helpers for unit and runtime tests
- the CLI target/profile inputs that make E2E scenarios explicit

For DOM-based smoke checks that execute the built runtime directly, prefer synchronizing on
`waitForNavigationReady(...)` from `mainz/testing` or on the bubbled `mainz:navigationready` event
before asserting title, locale, body, or head behavior. On multi-app pages, prefer scoping the wait
to the relevant app root.

When a smoke check is validating an expected failure or a pending state rather than successful
settlement, prefer `waitForNavigationError(...)`, `waitForNavigationAbort(...)`, or
`waitForNavigationStart(...)` over generic timeout-based inference.
