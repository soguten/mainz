# Mainz Testing Helper Guide

This folder contains tests for the `mainz/testing` harness itself.

The goal is to diagnose helper behavior (`renderMainzComponent`, selector
helpers, event helpers, cleanup semantics), not component runtime features
already covered in `src/components/tests`.

## Test Groups

Use `group` as the common language for naming and documentation.

Typical groups in this folder:

- `render`
- `events`
- `query`
- `isolation`

## Test File Structure

Each suite follows this order:

1. `/// <reference lib="deno.ns" />`
2. short suite-level comment
3. imports
4. `await setupMainzDom()`
5. dynamic fixture import
6. behavior-focused tests

## Example

`mainz-testing.example.test.ts`

```ts
/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import(
  "./mainz-testing.example.fixture.tsx"
) as typeof import("./mainz-testing.example.fixture.tsx");

Deno.test("testing helper/render: should expose props before first render", () => {
  const screen = renderMainzComponent(fixtures.ExampleRenderComponent, {
    props: { label: "hello" },
  });

  assertEquals(screen.getBySelector("p").textContent, "hello");
  screen.cleanup();
});
```

`mainz-testing.example.fixture.tsx`

```tsx
import { Component } from "mainz";

export class ExampleRenderComponent
  extends Component<{ label?: string }, Record<string, never>> {
  override render(): HTMLElement {
    return <p>{this.props.label ?? "none"}</p>;
  }
}
```

## File Layout

Each suite is split into two files:

- `mainz-testing.<group>.test.ts`
- `mainz-testing.<group>.fixture.tsx`

## Naming Convention

Use behavior names prefixed by helper scope/group:

- `testing helper/render: ...`
- `testing helper/events: ...`
- `testing helper/query: ...`
- `testing helper/isolation: ...`

## Why `.test.ts` Stays in TS

The harness requires `setupMainzDom()` before loading DOM-dependent fixtures.

Safe order:

1. import test helpers
2. call `setupMainzDom()`
3. dynamically import TSX fixtures
4. run tests

## Fixture Convention

Use `*.fixture.tsx` as the default and only fixture format in this folder.

## Template Files

Use these files as the canonical starter when creating a new suite:

- `_template.test.ts`
- `_template.fixture.tsx`
