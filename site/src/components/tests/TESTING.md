# Mainz Site Component Testing Guide

This folder follows the same testing convention used across Mainz component suites.

## Required Structure

Every suite in this folder should use:

1. `*.test.ts` for the test runner
2. `*.fixture.tsx` for component exports and test helpers
3. `await setupMainzDom()` before loading the fixture
4. dynamic fixture import after DOM setup

## Why This Matters

Site components also extend `HTMLElement`, so importing TSX fixtures before
`setupMainzDom()` can fail during module evaluation.

The framework now protects the base `Component` import in non-DOM environments, which helps build and server tooling. Tests should still use the fixture pattern because JSX/component modules may touch DOM APIs during evaluation.

## Canonical Pattern

```ts
/// <reference lib="deno.ns" />

import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import("./Example.fixture.tsx") as typeof import("./Example.fixture.tsx");
```

## Rule For Agents

Do not infer an alternative test structure here.
Use `fixture.tsx` + dynamic import as the default test pattern for Mainz suites.

## Integration Contract Checklist

Site tests are integration coverage for runtime contracts that already exist in
the core.

When a change affects the sample site, prefer asserting one of these behaviors:

- major interactive surfaces coexist without cross-talk
- rerender keeps injected layout styles intact
- workshop/editor behavior survives UI upgrades
- page composition still reflects core runtime guarantees

Keep site tests focused and complementary.
The canonical contract should still live in the core suites whenever possible.
