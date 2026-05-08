# Testing Matrix

This page documents the repository's internal test architecture.

It is useful for maintainers and contributors, but it is not a public framework
API contract.

## Why It Exists

Mainz supports independent execution axes that can interact in surprising ways:

- render mode: `csr`, `ssg`
- navigation mode: `spa`, `mpa`
- target: `site`, `docs`, `playground`
- profile and publishing variants like `gh-pages` and `plain-static`

A test that only validates one scenario can miss regressions introduced in
another supported combination. Matrix tests exist to protect framework
invariants across those combinations.

The key question is not only:

- "does feature X work?"

It is also:

- "does feature X still work across every supported combination that should
  support it?"

## Core Idea

The matrix is built around "build once, assert many".

For one relevant build combination, the suite should:

1. run one engine-backed build
2. reuse the generated files from `dist`
3. run multiple focused assertions against that same output

This keeps the expensive part, the build, from being repeated for every domain
check.

## Current Shape

The declarative suite in `tests/matrix/suite.test.ts` is the core matrix
entrypoint:

- case-owned intent through `matrixTest(...)`
- recipe grouping through the harness
- fixture-family naming through `RoutedApp` and `RootApp`
- lower-boilerplate route rendering through the resolved fixture API

The default `test:e2e:core` task runs the declarative suite plus dedicated core
fixture suites such as `single-locale`, `base-path`, `head-seo`,
`generated-tag-stability`, `routed-di-entries`, `routed-di-client`, and
`routed-authorization`.

The declarative suite expands the supported `testCombinations` from
`tests/helpers/build.ts`, `tests/helpers/fixture-config.ts`,
`tests/helpers/fixture-io.ts`, `tests/helpers/document.ts`, and
`tests/helpers/navigation.ts`:

- `ssg + spa`
- `ssg + mpa`
- `ssg + mpa`
- `csr + spa`
- `csr + mpa`
- `csr + mpa`

For each combination, the harness:

1. groups cases by recipe and builds the backing fixture once
2. executes one `t.step(...)` per matching case
3. passes the shared resolved fixture to each case

## What Belongs In The Core Matrix

The core matrix is for contracts that share the same build shape:

- target: `core-contracts`
- mode: one of `csr` or `ssg`
- navigation: one of `spa` or `mpa`

Today that shared cluster covers:

- routing
- localized notFound behavior
- i18n redirects and localized routes
- navigation behavior
- hydration behavior
- head/canonical/hreflang behavior

If a new test uses that same build shape and only needs to inspect the
already-built output, it is a candidate for the core matrix.

## What Does Not Belong In The Core Matrix

A test usually should stay outside the core matrix when it changes the build
shape or needs its own setup, for example:

- `docs` target behavior
- `gh-pages` profile
- `plain-static` profile
- custom `basePath`
- temporary config files
- smoke checks that intentionally validate a real app flow rather than one
  shared artifact family

These cases belong in dedicated matrix families, target-local checks, or smoke
suites.

## Fixtures vs Real Apps

The repository uses two different kinds of E2E targets on purpose:

- fixtures in `tests/fixtures/*`
- real published apps such as `site` and `docs`

The default rule is:

- `core`: prefer fixtures
- `smoke`: prefer real apps

That split exists to keep responsibilities clear.

Fixtures are the default for framework-contract coverage because they are:

- smaller
- more explicit
- easier to reason about
- less likely to fail because unrelated app content changed

Real apps are the default for smoke coverage because they answer a different
question:

- does Mainz still work when exercised through the actual published app targets?

Use a real app outside `smoke` only when the published target behavior is itself
the contract being protected.

Current `site`-specific publication checks now live under
[site/tests](../../site/tests) with non-discovery filenames, so they stay close
to the target without remaining part of the framework's default auto-discovered
suite.

Examples:

- validating shared routing, hydration, or head semantics across supported
  combinations should usually use fixtures
- validating that `site` still publishes the expected `gh-pages` SEO output can
  justify a real-app test, because the target-specific publication behavior is
  the thing being protected

When choosing between them, prefer this rule of thumb:

- if the contract is "framework behavior in a controlled shape", use a fixture
- if the contract is "behavior of the real published target", use the real app

## File Roles

The matrix works because the files have clear responsibilities.

### `tests/matrix/suite.test.ts`

This file owns the declarative core matrix suite:

- running the default supported combinations from the harness
- composing the shared `matrix/core` case list from
  `tests/matrix/cases/core/core-matrix-cases.ts`
- validating recipe grouping and fixture resolution in a real E2E path

This file is the default core path.

### `tests/checks/*.ts`

This folder is now a thin home for reusable higher-level checks that are still
shared by smoke or other non-matrix suites.

The old matrix-oriented helper scripts have been removed as their ownership
moved into `tests/matrix/cases/*`, and the remaining check files are now
imported directly rather than run as standalone `deno run` scripts.

### `tests/helpers/*`

This helper module group owns shared test utilities:

- the matrix combinations
- explicit build-context creation
- engine-backed fixture build helpers
- in-memory fixture target definitions for harness-owned builds
- output path resolution
- direct-load vs preview fixture loading
- common DOM assertions
- temporary fixture target config generation only for tests that intentionally
  exercise `--config` or other CLI/config-loading paths

The matrix-facing build helpers now call `src/build/*` directly instead of
shelling into `src/cli/mainz.ts`.

The declarative harness now builds its fixture families from in-memory target
definitions, so the default matrix path no longer needs to materialize a
temporary `mainz.fixture.config.ts` file just to reach the engine.

Profile loading and publication metadata resolution now also live under
`src/build/profiles.ts`, which keeps the CLI closer to a thin command adapter
over the build engine.

The SSG/CSR document emission path and HTML prerender helpers now also live
under `src/build/artifacts.ts`, which removes another large block of engine
semantics from the CLI layer.

Build job selection now also lives under `src/build/jobs.ts`, so production job
derivation, forced test recipes, and routed target eligibility are no longer
implemented in the CLI namespace.

The render-recipe list used for job expansion now also lives inside
`src/build/jobs.ts`, instead of remaining part of the normalized config shape.

Production job selection now derives supported render recipes from discovered
pages and filesystem routes instead of treating `csr + ssg` as a public build
matrix:

- pages discovered as `ssg` only produce `ssg` jobs
- pages discovered as `csr` only produce `csr` jobs
- mixed targets keep both recipes when discovery proves both are present

The matrix and smoke helper layer still intentionally bypasses that production
recipe filter when a test explicitly asks for a combination, so RFC-style forced
`csr`/`ssg` coverage stays confined to test infrastructure and the explicit
internal `src/build/testing.ts` path rather than reappearing in public config or
CLI surfaces.

The harness now also exposes structured recipe diagnostics through
`formatMatrixRecipeDiagnostics(...)` in [harness.ts](../matrix/harness.ts#L1).
That output is still available in verbose mode through `MAINZ_MATRIX_VERBOSE=1`,
and the same recipe summary is appended to build/case failures so grouping
behavior is visible when a matrix slice breaks. When the artifact has already
been built, the same diagnostics also include the resolved `outputDir`, which
keeps build sharing inspectable at the artifact level rather than only at the
recipe-key level.

Build execution now also lives under `src/build/execution.ts`, so serial job
execution, per-job Vite invocation, and CSR/SSG artifact dispatch are no longer
implemented in the CLI namespace.

Target page discovery now also lives under
`src/routing/target-page-discovery.ts`, so the engine and diagnostics no longer
depend on any CLI module for route/page discovery.

Diagnose command collection, formatting, and fail-policy evaluation now also
live under `src/diagnostics/command.ts`, so `src/cli/mainz.ts` only dispatches
the command instead of owning diagnostics presentation logic.

The same engine-backed helper path is now also used by smoke coverage and by the
target-specific tests under [site/tests](../../site/tests) when they only need
build artifacts rather than CLI contract coverage.

CLI-specific process helpers now live in `tests/helpers/cli.ts` and are consumed
directly by the CLI test files, instead of being re-exported as part of the
default helper barrel.

CLI/config-specific fixture file generation now also lives in
`tests/helpers/fixture-config.ts`, which keeps the engine-backed matrix helpers
in `tests/helpers/build.ts` focused on harness-owned builds rather than
temporary config authoring.

### `tests/matrix/*`

These files own the new RFC-shaped matrix layer:

- `tests/matrix/harness.ts`: declarative case and suite orchestration
- `tests/matrix/fixtures.ts`: stable fixture ids and fixture-family resolution
- `tests/matrix/render-fixture.ts`: resolved fixture helpers such as
  `render(...)`, `readHtml(...)`, `readJson(...)`, and preview-style route
  loading
- `tests/matrix/cases/core/core-matrix-cases.ts`: composition of the default
  `matrix/core` case set so the suite file does not become the main authoring
  surface
- `tests/matrix/cases/di/routed-di-matrix-cases.ts`: composition of the DI case
  clusters so SSG `entries()` coverage and CSR client-route coverage stay split
  at suite level
- `tests/matrix/cases/authorization/routed-authorization-matrix-cases.ts`:
  composition of the authorization case cluster so anonymous redirects and
  forbidden-member behavior stay split as separate case intents
- `tests/matrix/cases/base-path/base-path-matrix-cases.ts`: composition of the
  base-path case cluster so localized home/navigation behavior and localized
  notFound/SEO behavior stay split as separate case intents
- `tests/matrix/cases/single-locale/single-locale-matrix-cases.ts`: composition
  of the single-locale case cluster so home-route navigation behavior and
  child-route publication behavior stay split as separate case intents
- `tests/matrix/cases/*`: modular case files organized by protected behavior

### `tests/fixtures/*`

These directories are dedicated E2E apps used to validate framework contracts
intentionally.

The first fixture wave includes:

- `core-contracts`
- `base-path`
- `head-seo`
- `single-locale-routing`

The goal of these fixtures is to keep framework coverage explicit and narrow
instead of depending only on the example apps.

Current fixture responsibilities:

- `core-contracts`: shared routing, notFound, i18n, navigation, hydration, and
  head contracts
- `base-path`: localized routing, navigation, and SEO behavior under a
  publication base path
- `head-seo`: canonical and hreflang emission for localized document routes
- `single-locale-routing`: unprefixed route emission and navigation for
  single-locale targets

The new matrix layer is starting to map these build fixtures into RFC-style
fixture families:

- `RoutedApp`
  - routing
  - notFound
  - i18n
  - head
  - navigation
- `RootApp`
  - hydration
- `RoutedDIEntriesApp`
  - DI-backed `entries()`
  - DI-backed route rendering on `ssg` pages
- `RoutedDIClientApp`
  - DI-backed client route state
  - DI-backed client route summaries on `csr + spa`
- `RoutedAuthorizationApp`
  - SPA login redirects for anonymous users
  - SPA forbidden output for authenticated users who still lack access
- `SingleLocaleRoutedApp`
  - unprefixed routes for single-locale targets
  - single-locale direct loads and SPA navigation
- `BasePathApp`
  - basePath-aware direct loads
  - basePath-aware locale switching and SEO
- `HeadSeoApp`
  - localized canonical and hreflang output for CSR document routes
- `GeneratedTagStabilityApp`
  - generated page/component tag stability across prerendered HTML and client
    registration

Those fixture families now have their own dedicated backing fixtures:

- `tests/fixtures/routed-app`
- `tests/fixtures/root-app`
- `tests/fixtures/routed-di-app`
- `tests/fixtures/routed-authorization-app`
- `tests/fixtures/single-locale-routing`
- `tests/fixtures/base-path`
- `tests/fixtures/head-seo`
- `tests/fixtures/custom-element-generated-tag-stability`

That means the matrix cases already point at both the intended conceptual family
and a distinct artifact source, which makes future fixture growth much less
coupled.

The DI coverage is now split into two explicit suites:

- `tests/matrix/routed-di-entries-suite.test.ts`
  - SSG-only `entries()` and prerender coverage on `RoutedDIEntriesApp`
- `tests/matrix/routed-di-client-suite.test.ts`
  - CSR SPA client-route coverage on `RoutedDIClientApp`

The authorization coverage now stays split at case level inside one dedicated
suite:

- `tests/matrix/routed-authorization-suite.test.ts`
  - `anonymousRedirectCase` for localized login redirects
  - `forbiddenMemberCase` for blocked authenticated members

The base-path coverage now also stays split at case level inside one dedicated
suite:

- `tests/matrix/base-path-suite.test.ts`
  - `basePathHomeCase` for localized home routing and navigation
  - `basePathNotFoundCase` for localized 404 routing and SEO

The single-locale coverage now also stays split at case level inside one
dedicated suite:

- `tests/matrix/single-locale-suite.test.ts`
  - `singleLocaleHomeCase` for unprefixed home-route navigation
  - `singleLocaleQuickstartCase` for unprefixed child-route publication

The current transition rule for render ownership is:

- discovered pages keep the render mode chosen by page discovery
- discovered pages without `@RenderMode(...)` still default to `csr`
- filesystem-only page files now default locally to `csr` when no explicit file
  suffix provides a stronger render signal
- publication metadata no longer exposes a single `renderMode`; it only reports
  publication-wide fields such as the target-level `outDir`, `basePath`, and
  `navigation`
- top-level `render.modes` is no longer part of public config
- production metadata no longer honors `overridePageMode`
- `mainz build --mode` is no longer part of the public production CLI
- render is page-owned in production and undecorated pages default to `csr`

Fixture authoring direction for this layer:

- each fixture family should read as a small fake app with its own theme and
  shell
- test probes such as hydration widgets should live as internal subtrees, not as
  the whole app
- fixture-specific component names should prefer the scenario language over
  generic names like `TutorialPage`

## Build Contexts

The grouped suites now pass an explicit build context instead of relying only on
implicit `dist/<target>/<mode>` conventions.

Current helpers create and consume a `TestBuildContext` with the important build
inputs already resolved:

```ts
type TestBuildContext = {
  fixtureName?: string;
  fixtureRoot?: string;
  outputDir: string;
  targetName: string;
  mode: "csr" | "ssg";
navigation: "spa" | "mpa";
  profile?: string;
  configPath?: string;
};
```

This context exists to make artifact reuse explicit:

- orchestration files build once and hold the context
- domain checks receive the same context
- checks read from `context.outputDir` instead of reconstructing state ad hoc
- fixture and `site`-based suites can share the same helper model

That makes the next fixture migrations safer because the contract between
"build" and "assert" is now a real object instead of a hidden path convention.

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

Use direct load when the test only needs the emitted HTML file itself and the
runtime boot process.

Typical helper:

- `resolveDirectLoadFixture(...)`
- `fixture.renderDocument(...)`

Good for:

- localized page HTML
- head state after boot
- hydration behavior from a known page
- basePath scenarios where a specific emitted document such as `en/index.html`
  or `404.html` must be paired with an explicit URL

### Preview-style resolution

Use preview-style resolution when the contract depends on how built routes are
served, especially 404 behavior.

Typical helper:

- `resolvePreviewFixture(...)`
- `createArtifactPreviewHandler(...)`
- `fixture.render(...)`

Good for:

- route status behavior
- localized notFound handling
- preview server semantics

Rule of thumb:

- use `fixture.render(...)` when the intent is "open this route"
- use `fixture.renderDocument(...)` when the intent is "open this emitted HTML
  document at this URL"

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

Shared-build matrix for the central framework contracts plus dedicated core
fixtures.

This task now runs:

- the declarative core matrix suite
- dedicated core fixtures such as `single-locale-routing`
- dedicated matrix families such as `routed-di`
- dedicated matrix families such as `routed-authorization`

Use when changing:

- CLI build output
- routing behavior
- i18n output
- navigation output
- hydration/head behavior
- dedicated framework fixtures

### Target-specific publication checks

Build-heavy scenarios with different profiles or setup now split in two
directions:

- framework-owned fixture coverage stays under `test:e2e:core`
- target-owned publication checks live close to the target, such as
  `site/tests/*.e2e.ts`

Use target-local checks when changing:

- `gh-pages`
- `plain-static`
- special SEO publication behavior that belongs to the real app output

Keep those checks outside the framework auto-discovered suite unless the
framework itself owns the contract being asserted.

### `test:smoke`

Smaller end-to-end checks against real apps.

Use when you want confidence that example apps still behave as expected.

This bucket is the default home for `site` and `docs` coverage.

## CI Shape

The repository CI is now split by test family instead of using one monolithic
test job:

- `fast`: always runs
- `e2e:core`: runs on `main` and on pull requests that touch core build/runtime
  areas
- `smoke`: runs on `main` and on pull requests that touch real app surfaces like
  `site` or `docs-site`
- target-local publication checks such as `site/tests/*.e2e.ts` can be run
  separately when those targets change
- `test`: still runs as the authoritative full suite on `main`

This keeps local and CI execution aligned with the same family names used in
`deno.json`.

## How To Expand The Matrix

Use this decision flow.

This section covers two different kinds of expansion:

- expanding the current matrix with more cases inside the existing execution
  axes
- evolving the test architecture when Mainz gains a new axis or a new
  cross-cutting feature

Those are not the same kind of change.

### Add a new `t.step(...)` when:

- the new assertions use the same `core-contracts + mode + navigation` build
  shape
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
navigation: "spa" | "mpa";
  context?: TestBuildContext;
}): Promise<void> {
  const context = args.context ?? await buildRoutedAppForCombination(args);

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

If the setup is different, prefer a separate suite over forcing the case into
the core matrix.

When deciding the setup, also choose the target type deliberately:

- prefer fixtures for framework contracts
- prefer real apps for smoke coverage
- use real apps in `special` only when target-specific published behavior is the
  contract

## Expanding Cases vs Expanding Architecture

It is useful to separate these two decisions explicitly.

### Expanding cases inside the current matrix

This is the simpler kind of growth.

You stay inside the current execution model and only add more assertions for
supported combinations that already exist today.

Examples:

- a new routing invariant for `csr + mpa`
- another head assertion over emitted localized routes
- an extra hydration assertion over the current `core-contracts` artifact

This usually means:

- add a `t.step(...)`
- extend an existing check
- or add a new check for the same `core-contracts + mode + navigation` shape

### Expanding the architecture with a new axis

This happens when Mainz gains a new execution dimension that changes the build
or runtime shape.

Examples:

- a new render mode such as `ssr`
- a new navigation family
- a new server/runtime integration mode

This is not just "add more cases".

It usually requires architecture work first:

1. define the new axis and the supported combinations
2. decide whether the current matrix can absorb that axis safely
3. create a new fixture or suite family if the artifact shape changes
4. update `TestBuildContext`, helper contracts, and tasks if the shared build
   model changes
5. only then add the contract assertions themselves

Rule of thumb:

- if the build artifact family is materially different, do not force it into the
  existing core matrix
- prefer a new matrix family or a new grouped suite

For example, if Mainz adds `ssr`, the first question is not "which check gets a
new assertion?" The first question is "does `ssr` produce the same artifact
family as `csr` and `ssg`, or does it need its own orchestration, preview model,
and fixtures?"

If it needs a different artifact family, it should likely become a new test
family rather than a new `t.step(...)` inside the current core matrix.

### Expanding with a new cross-cutting feature

This happens when a feature cuts across existing layers without necessarily
creating a whole new render mode.

Examples:

- an auth/authz decorator
- route guards
- middleware-like page metadata
- caching or data policy decorators

For these features, the first question is:

- is this mainly a local API contract, or is it a framework-wide integration
  contract?

Use this split:

- local API semantics belong first in `test:fast`
- framework-wide behavior across build/runtime combinations belongs in E2E

For an auth decorator, a healthy rollout would usually look like this:

1. add fast tests for the decorator API itself
2. add one dedicated fixture that uses the decorator in a realistic route tree
3. decide which combinations matter: `ssg` may not need the same assertions as
   `csr`, while navigation behavior might matter a lot
4. add a grouped E2E suite if auth becomes a reusable contract family
5. add smoke only if the real `site` or `docs` app starts depending on that
   feature

The key idea is:

- new feature inside existing axes: extend checks or suites
- new axis or new artifact family: evolve the architecture first
- new cross-cutting feature: start with fast tests, then add the smallest
  fixture-driven E2E layer

## Example: Adding A New Core Domain

Imagine we want a new grouped domain called `metadata` for assertions that
validate emitted document metadata after boot, but that still uses the same
shared `core-contracts + mode + navigation` build shape.

The flow should be:

1. create a focused check, for example `tests/checks/metadata-matrix-check.ts`
2. export `runMetadataMatrixCheck({ mode, navigation, context? })`
3. default to building when `context` is absent
4. load the generated artifact from `context.outputDir`
5. boot the page in isolated DOM state
6. assert only metadata-related contracts
7. register a new declarative case under `tests/matrix/cases/*`
8. let the harness group it with the existing recipe and reuse the shared
   `context`

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
- the setup is not the same shared artifact family used by the `core-contracts`
  cluster

In that case:

1. create a dedicated E2E file for that family
2. build only the combinations relevant to that family
3. keep the support logic close to the new suite or add a dedicated check set
4. keep it target-local or run it under `test:smoke`, depending on its role

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
8. run the smallest relevant suite first, then run `deno task test`

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
- `deno task test:smoke`
- `deno task test`
- `deno test -A site/tests/*.e2e.ts`

For day-to-day work:

- start with `test:fast` for local feedback
- run `test:e2e:core` for changes that affect build/runtime contracts
- run `deno test -A site/tests/*.e2e.ts` for target-owned publication checks
- run `test:smoke` when validating real app behavior
- run `test` before merge for broad changes

## Future Direction

The current matrix is centered on the shared `core-contracts` build cluster, but
the migration path is now explicit:

1. keep growing the declarative matrix in `tests/matrix/*`
2. move cases onto RFC-shaped fixture families such as `RoutedApp` and `RootApp`
3. split the backing fixture content when the scenario families stop sharing the
   same build shape

Over time it can evolve in two directions:

- dedicated framework fixtures that intentionally cover one responsibility each
- better grouping for special-build families like `docs`, `gh-pages`, and
  `plain-static`

The important rule is to keep the matrix intentional:

- reuse builds when the artifact family is the same
- split suites when the build shape or responsibility changes
