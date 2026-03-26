## Testing in Mainz

Mainz exposes a public testing surface through `mainz/testing`.

The goal is not to ship a full test runner. The goal is to make the framework easy to test across
the layers that usually hurt:

- unit and component tests
- runtime and navigation tests
- smoke tests over real builds
- end-to-end tests over explicit build combinations

## Public testing surface

Today the public testing entrypoint is:

```ts
import {
    nextTick,
    prepareNavigationTest,
    renderMainzComponent,
    setupMainzDom,
    waitForNavigationAbort,
    waitFor,
    waitForNavigationError,
    waitForNavigationReady,
    waitForNavigationStart,
} from "mainz/testing";
```

That gives you three practical groups of tools.

## 1. Component testing

Use `setupMainzDom()` and `renderMainzComponent()` to test a Mainz component in a DOM-like
environment powered by Happy DOM.

Good for:

- first render assertions
- props and attrs bootstrap
- local state behavior
- DOM event handling
- controlled inputs and selects
- cleanup and isolation

See:

- [`component-testing.md`](./component-testing.md)

## 2. Runtime testing

Use `prepareNavigationTest()` for tests that exercise the runtime itself, especially routing and
navigation behavior.

Good for:

- SPA route resolution
- locale-aware navigation
- enhanced-MPA transitions
- basePath handling
- runtime head updates

See:

- [`runtime-testing.md`](./runtime-testing.md)

## 3. Smoke and E2E testing

Mainz does not ship a browser E2E runner, but it does make E2E and smoke testing easier by keeping
build inputs explicit:

- target
- mode
- navigation
- profile

That means a Playwright, Cypress, or custom Deno-based suite can test meaningful combinations
without guessing framework state from hidden defaults.

See:

- [`e2e-and-smoke.md`](./e2e-and-smoke.md)

## Async helpers

Two small helpers are especially useful in tests:

- `nextTick()` for waiting one render/event turn
- `waitFor(predicate)` for polling until an async condition becomes true
- `waitForNavigationStart(...)` for synchronizing on accepted Mainz navigation
- `waitForNavigationAbort(...)` for synchronizing on canceled Mainz navigation
- `waitForNavigationError(...)` for synchronizing on failed Mainz navigation
- `waitForNavigationReady(...)` for synchronizing on completed Mainz navigation

Guideline:

- pending-state test: start with `waitForNavigationStart(...)`
- canceled/superseded path: prefer `waitForNavigationAbort(...)`
- failure-path test: prefer `waitForNavigationError(...)` over timeout-based inference
- single-app page: `waitForNavigationReady()` is usually enough
- multi-app page: prefer `waitForNavigationReady({ target: appRoot })`

These are intentionally small. Mainz tries to make normal DOM assertions readable instead of hiding
everything behind a big custom test DSL.

## What this page is not

This section documents the public testing surface and testing-friendly patterns of the framework.

It does not document the repository's internal matrix architecture used to validate Mainz itself.
That contributor-facing document lives separately in:

- [`../../advanced/testing-matrix.md`](../../advanced/testing-matrix.md)
