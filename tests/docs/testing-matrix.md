# Testing Matrix

This page documents the repository's internal test architecture.

It is useful for maintainers and contributors, but it is not a public framework API contract.

## Why It Exists

Mainz supports independent execution axes that can interact in surprising ways:

- render mode: `csr`, `ssg`
- navigation mode: `spa`, `mpa`, `enhanced-mpa`
- target: `site`, `docs`, `playground`
- profile and publishing variants like `gh-pages` and `plain-static`

A test that only validates one scenario can miss regressions introduced in another supported
combination. Matrix tests exist to protect framework invariants across those combinations.

The key question is not only:

- "does feature X work?"

It is also:

- "does feature X still work across every supported combination that should support it?"

## Core Idea

The matrix is built around "build once, assert many".

For one relevant build combination, the suite should:

1. run one CLI build
2. reuse the generated files from `dist`
3. run multiple focused assertions against that same output

This keeps the expensive part, the build, from being repeated for every domain check.

## Current Shape

The main grouped suite lives in `tests/e2e/core/build.core-matrix.e2e.test.ts`.

It iterates over `cliTestCombinations` from `tests/helpers/test-helpers.ts`:

- `ssg + spa`
- `ssg + mpa`
- `ssg + enhanced-mpa`
- `csr + spa`
- `csr + mpa`
- `csr + enhanced-mpa`

For each combination, the suite:

1. builds `core-contracts` exactly once
2. executes one `t.step(...)` per domain
3. passes the shared `context` to the domain check

## What Belongs In The Core Matrix

The core matrix is for contracts that share the same build shape:

- target: `core-contracts`
- mode: one of `csr` or `ssg`
- navigation: one of `spa`, `mpa`, or `enhanced-mpa`

Today that shared cluster covers:

- routing
- localized notFound behavior
- i18n redirects and localized routes
- navigation behavior
- hydration behavior
- head/canonical/hreflang behavior

If a new test uses that same build shape and only needs to inspect the already-built output, it is a
candidate for the core matrix.

## What Does Not Belong In The Core Matrix

A test usually should stay outside the core matrix when it changes the build shape or needs its own
setup, for example:

- `docs` target behavior
- `gh-pages` profile
- `plain-static` profile
- custom `basePath`
- temporary config files
- smoke checks that intentionally validate a real app flow rather than one shared artifact family

These cases belong in dedicated `special` or `smoke` suites.

## Fixtures vs Real Apps

The repository uses two different kinds of E2E targets on purpose:

- fixtures in `tests/fixtures/*`
- real published apps such as `site` and `docs`

The default rule is:

- `core`: prefer fixtures
- `special`: prefer fixtures or other controlled setups
- `smoke`: prefer real apps

That split exists to keep responsibilities clear.

Fixtures are the default for framework-contract coverage because they are:

- smaller
- more explicit
- easier to reason about
- less likely to fail because unrelated app content changed

Real apps are the default for smoke coverage because they answer a different question:

- does Mainz still work when exercised through the actual published app targets?

Use a real app outside `smoke` only when the published target behavior is itself the contract being
protected.

Examples:

- validating shared routing, hydration, or head semantics across supported combinations should
  usually use fixtures
- validating that `site` still publishes the expected `gh-pages` SEO output can justify a real-app
  test, because the target-specific publication behavior is the thing being protected

When choosing between them, prefer this rule of thumb:

- if the contract is "framework behavior in a controlled shape", use a fixture
- if the contract is "behavior of the real published target", use the real app

## File Roles

The matrix works because the files have clear responsibilities.

### `tests/e2e/core/build.core-matrix.e2e.test.ts`

This file owns orchestration:

- iterating supported combinations
- triggering the shared build
- organizing failure output with `t.step(...)`

It should stay small and readable.

### `tests/checks/*.ts`

These files own domain assertions.

Examples:

- `routing-matrix-check.ts`
- `not-found-matrix-check.ts`
- `i18n-matrix-check.ts`
- `navigation-matrix-check.ts`
- `hydration-matrix-check.ts`
- `head-matrix-check.ts`

Each check should focus on one contract family.

### `tests/helpers/test-helpers.ts`

This file owns shared test utilities:

- the matrix combinations
- explicit build-context creation
- CLI build helpers
- output path resolution
- direct-load vs preview fixture loading
- common DOM assertions
- temporary fixture target config generation for E2E fixtures

### `tests/fixtures/*`

These directories are dedicated E2E apps used to validate framework contracts intentionally.

The first fixture wave now includes:

- `core-contracts`
- `base-path`
- `head-seo`
- `navigation-override`
- `single-locale-routing`

The goal of these fixtures is to keep framework coverage explicit and narrow instead of depending
only on the example apps.

Current fixture responsibilities:

- `core-contracts`: shared routing, notFound, i18n, navigation, hydration, and head contracts
- `base-path`: localized routing, navigation, and SEO behavior under a publication base path
- `head-seo`: canonical and hreflang emission for localized document routes
- `navigation-override`: profile-driven navigation override reaching the final runtime semantics
- `single-locale-routing`: unprefixed route emission and navigation for single-locale targets

## Build Contexts

The grouped suites now pass an explicit build context instead of relying only on implicit
`dist/<target>/<mode>` conventions.

Current helpers create and consume a `CliBuildContext` with the important build inputs already
resolved:

```ts
type CliBuildContext = {
    fixtureName?: string;
    fixtureRoot?: string;
    outputDir: string;
    targetName: string;
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    profile?: string;
    configPath?: string;
};
```

This context exists to make artifact reuse explicit:

- orchestration files build once and hold the context
- domain checks receive the same context
- checks read from `context.outputDir` instead of reconstructing state ad hoc
- fixture and `site`-based suites can share the same helper model

That makes the next fixture migrations safer because the contract between "build" and "assert" is
now a real object instead of a hidden path convention.

## How A Matrix Check Works

A matrix check should follow this pattern:

1. accept `{ mode, navigation, context? }`
2. build by default when `context` is not provided
3. reuse `context.outputDir` when a grouped suite already built the artifact
4. create isolated DOM/runtime state for each assertion
5. assert one focused domain clearly

That contract allows the same check to work in two modes:

- standalone debugging: the check builds for itself
- grouped execution: core matrix builds once and the check reuses the artifact

## Direct Load vs Preview

The matrix currently uses two ways to inspect built output.

### Direct load

Use direct load when the test only needs the emitted HTML file itself and the runtime boot process.

Typical helper:

- `resolveDirectLoadFixture(...)`

Good for:

- localized page HTML
- head state after boot
- hydration behavior from a known page

### Preview-style resolution

Use preview-style resolution when the contract depends on how built routes are served, especially
404 behavior.

Typical helper:

- `resolvePreviewFixture(...)`
- `createSsgPreviewHandler(...)`

Good for:

- route status behavior
- localized notFound handling
- preview server semantics

## Test Layers

The repository currently has four practical test buckets:

### `test:fast`

Fast unit and integration feedback.

Use when changing:

- components
- jsx/runtime behavior
- config normalization
- routing internals
- testing utilities

### `test:e2e:core`

Shared-build matrix for the central framework contracts plus dedicated core fixtures.

Use when changing:

- CLI build output
- routing behavior
- i18n output
- navigation output
- hydration/head behavior
- dedicated framework fixtures

### `test:e2e:special`

Build-heavy scenarios with different profiles or setup.

Use when changing:

- `gh-pages`
- `plain-static`
- base path logic
- special SEO publication behavior

This family now also groups related SSG publication assertions so one build can cover multiple
checks inside the same artifact family.

This bucket should still lean fixture-first when possible. Reach for `site` or `docs` here only
when the target-specific published output is the behavior under test.

### `test:smoke`

Smaller end-to-end checks against real apps.

Use when you want confidence that example apps still behave as expected.

This bucket is the default home for `site` and `docs` coverage.

## CI Shape

The repository CI is now split by test family instead of using one monolithic test job:

- `fast`: always runs
- `e2e:core`: runs on `main` and on pull requests that touch core build/runtime areas
- `e2e:special`: runs on `main` and on pull requests that touch profile, publication, or
  special-build areas
- `smoke`: runs on `main` and on pull requests that touch real app surfaces like `site` or
  `docs-site`
- `test`: still runs as the authoritative full suite on `main`

This keeps local and CI execution aligned with the same family names used in `deno.json`.

## How To Expand The Matrix

Use this decision flow.

This section covers two different kinds of expansion:

- expanding the current matrix with more cases inside the existing execution axes
- evolving the test architecture when Mainz gains a new axis or a new cross-cutting feature

Those are not the same kind of change.

### Add a new `t.step(...)` when:

- the new assertions use the same `core-contracts + mode + navigation` build shape
- the generated artifact can be safely reused
- the new domain still fits the purpose of the core matrix

Examples:

- another routing invariant
- another hydration invariant
- another head/i18n/navigation assertion over the same output

### Add or extend a check when:

- the domain logic is large enough to deserve its own file
- multiple assertions belong together under one contract family
- you want the same logic to be reusable in standalone execution

Recommended shape:

```ts
export async function runExampleMatrixCheck(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    context?: CliBuildContext;
}): Promise<void> {
    const context = args.context ?? await buildCoreContractsForCombination(args);

    // load fixture from context.outputDir
    // boot runtime in isolated DOM
    // assert one contract family
}
```

### Create a separate test file when:

- the target changes
- the profile changes output semantics
- a custom config is required
- the setup no longer fits the shared-build assumptions

If the setup is different, prefer a separate suite over forcing the case into the core matrix.

When deciding the setup, also choose the target type deliberately:

- prefer fixtures for framework contracts
- prefer real apps for smoke coverage
- use real apps in `special` only when target-specific published behavior is the contract

## Expanding Cases vs Expanding Architecture

It is useful to separate these two decisions explicitly.

### Expanding cases inside the current matrix

This is the simpler kind of growth.

You stay inside the current execution model and only add more assertions for supported combinations
that already exist today.

Examples:

- a new routing invariant for `csr + enhanced-mpa`
- another head assertion over emitted localized routes
- an extra hydration assertion over the current `core-contracts` artifact

This usually means:

- add a `t.step(...)`
- extend an existing check
- or add a new check for the same `core-contracts + mode + navigation` shape

### Expanding the architecture with a new axis

This happens when Mainz gains a new execution dimension that changes the build or runtime shape.

Examples:

- a new render mode such as `ssr`
- a new navigation family
- a new server/runtime integration mode

This is not just "add more cases".

It usually requires architecture work first:

1. define the new axis and the supported combinations
2. decide whether the current matrix can absorb that axis safely
3. create a new fixture or suite family if the artifact shape changes
4. update `CliBuildContext`, helper contracts, and tasks if the shared build model changes
5. only then add the contract assertions themselves

Rule of thumb:

- if the build artifact family is materially different, do not force it into the existing core
  matrix
- prefer a new matrix family or a new grouped suite

For example, if Mainz adds `ssr`, the first question is not "which check gets a new assertion?" The
first question is "does `ssr` produce the same artifact family as `csr` and `ssg`, or does it need
its own orchestration, preview model, and fixtures?"

If it needs a different artifact family, it should likely become a new test family rather than a new
`t.step(...)` inside the current core matrix.

### Expanding with a new cross-cutting feature

This happens when a feature cuts across existing layers without necessarily creating a whole new
render mode.

Examples:

- an auth/authz decorator
- route guards
- middleware-like page metadata
- caching or data policy decorators

For these features, the first question is:

- is this mainly a local API contract, or is it a framework-wide integration contract?

Use this split:

- local API semantics belong first in `test:fast`
- framework-wide behavior across build/runtime combinations belongs in E2E

For an auth decorator, a healthy rollout would usually look like this:

1. add fast tests for the decorator API itself
2. add one dedicated fixture that uses the decorator in a realistic route tree
3. decide which combinations matter: `ssg` may not need the same assertions as `csr`, while
   navigation behavior might matter a lot
4. add a grouped E2E suite if auth becomes a reusable contract family
5. add smoke only if the real `site` or `docs` app starts depending on that feature

The key idea is:

- new feature inside existing axes: extend checks or suites
- new axis or new artifact family: evolve the architecture first
- new cross-cutting feature: start with fast tests, then add the smallest fixture-driven E2E layer

## Example: Adding A New Core Domain

Imagine we want a new grouped domain called `metadata` for assertions that validate emitted document
metadata after boot, but that still uses the same shared `core-contracts + mode + navigation` build
shape.

The flow should be:

1. create a focused check, for example `tests/checks/metadata-matrix-check.ts`
2. export `runMetadataMatrixCheck({ mode, navigation, context? })`
3. default to building when `context` is absent
4. load the generated artifact from `context.outputDir`
5. boot the page in isolated DOM state
6. assert only metadata-related contracts
7. call it from a new `t.step("metadata", ...)` in `build.core-matrix.e2e.test.ts`, reusing the
   shared `context`

Example:

```ts
await t.step("metadata", async () => {
    await runMetadataMatrixCheck({ ...combination, context });
});
```

That is a good fit because:

- the build shape did not change
- the artifact can be reused safely
- the new assertions belong to one coherent domain

## Example: Adding A New Special Group

Imagine we want a new family of tests for `docs + gh-pages`.

That should not be forced into the core matrix because:

- the target changes
- the profile changes output semantics
- the setup is not the same shared artifact family used by the `core-contracts` cluster

In that case:

1. create a dedicated E2E file for that family
2. build only the combinations relevant to that family
3. keep the support logic close to the new suite or add a dedicated check set
4. run it under `test:e2e:special` or `test:smoke`, depending on its role

The rule is simple:

- same artifact family: prefer grouping
- different artifact family: prefer a separate suite

## Recommended Expansion Workflow

When adding a new case:

1. define the contract in one sentence
2. identify the relevant build inputs: target, mode, navigation, profile, config
3. decide whether it belongs to `fast`, `core`, `special`, or `smoke`
4. reuse an existing check if the contract already matches its domain
5. otherwise create a new check with one clear responsibility
6. add the new `t.step(...)` or new suite
7. update this document if the matrix shape or responsibilities changed
8. run the smallest relevant task first, then run `deno task test`

## Conventions

These conventions keep the matrix maintainable:

- one check should represent one contract family
- checks should not trigger hidden extra builds
- checks should read from emitted output in `dist`
- DOM setup should be isolated per assertion
- failure messages should include the active combination when useful
- orchestration files should stay thin

## Running The Tests

Useful commands:

- `deno task test:fast`
- `deno task test:e2e:core`
- `deno task test:e2e:special`
- `deno task test:smoke`
- `deno task test`

For day-to-day work:

- start with `test:fast` for local feedback
- run `test:e2e:core` for changes that affect build/runtime contracts
- run `test:e2e:special` for profile or basePath work
- run `test:smoke` when validating real app behavior
- run `test` before merge for broad changes

## Future Direction

The current matrix is centered on the shared `core-contracts` build cluster.

Over time it can evolve in two directions:

- dedicated framework fixtures that intentionally cover one responsibility each
- better grouping for special-build families like `docs`, `gh-pages`, and `plain-static`

The important rule is to keep the matrix intentional:

- reuse builds when the artifact family is the same
- split suites when the build shape or responsibility changes
