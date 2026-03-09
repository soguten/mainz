# Mainz Component Testing Guide

This folder defines conventions to keep Mainz component tests consistent, readable,
and easy to maintain.

## Test Groups

Use `group` as the common language across all test areas.

Typical groups in this folder:

- `attrs`
- `events`
- `initial state`
- `inline events`
- `patchChildren`
- `render owner`
- `stateOverride`
- `styles` / `tagName`

## Test File Structure

A suite typically follows this structure:

1. `/// <reference lib="deno.ns" />`
2. suite-level comment explaining scope and intent
3. imports
4. `await setupMainzDom()`
5. dynamic fixture import
6. behavior-focused tests

## Example

`component.example.test.ts`

```ts
/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

await setupMainzDom();

const fixtures = await import("./component.example.fixture.tsx") as typeof import("./component.example.fixture.tsx");

Deno.test("counter/group: should increment count when clicked", () => {
    const screen = renderMainzComponent(fixtures.CounterExampleComponent);

    screen.click("button");
    screen.click("button");

    assertEquals(screen.getBySelector("button").textContent, "2");
    screen.cleanup();
});
```

`component.example.fixture.tsx`

```tsx
import { Component } from "mainz";

export class CounterExampleComponent extends Component<{}, { count: number }> {
    protected override initState() {
        return { count: 0 };
    }

    private increment = () => {
        this.setState({ count: this.state.count + 1 });
    };

    override render(): HTMLElement {
        return <button onClick={this.increment}>{String(this.state.count)}</button>;
    }
}
```

## File Layout

Each suite is split into two files:

- `*.test.ts` (test runner)
- `*.fixture.tsx` (helper components for the suite)

Example:

- `component.render-owner.test.ts`
- `component.render-owner.fixture.tsx`

## Naming Convention

Test names should read as behavior statements with a group prefix.

Examples:

- `attrs: should expose initial attributes on host`
- `patchChildren: should preserve keyed identity on reorder`
- `events: should dispatch keyboard events`

## Suite Comments

Each test file should start with a short suite comment containing:

1. a short title
2. one or two sentences explaining why the behavior matters

## Why `.test.ts` Stays in TS

The test environment requires `setupMainzDom()` before loading modules that depend on `HTMLElement`, `document`, or JSX runtime evaluation.

Safe order:

1. import test helpers
2. call `setupMainzDom()`
3. dynamically import TSX fixtures
4. run tests

## Why Fixtures Are TSX-Only

Fixtures represent real component usage scenarios.

Use `*.fixture.tsx` as the default and only fixture format in this project area.

## Template Files

Use these files as the canonical starter when creating a new suite:

- `_template.test.ts`
- `_template.fixture.tsx`
