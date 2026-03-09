# Mainz JSX Testing Guide

This folder contains tests for the JSX runtime surface (`h`, `Fragment`, `jsx`, `jsxs`, `jsxDEV`) and JSX integration with Mainz components.

Unlike `src/components/tests`, these suites are split across runtime layers, from low-level factory behavior to TSX integration scenarios.

## Test Groups

Use `group` as the common language for naming and documentation.

Typical groups in this folder:

- `factory`
- `runtime`
- `integration`
- `render-owner`

## File Structure Convention

Each group follows the same two-file pattern:

1. `<group>.test.ts`
2. `<group>.fixture.tsx`

## DOM Bootstrap and TSX Safety

Most suites call `setupMainzDom()` before importing fixtures that depend on
`HTMLElement`, `document`, or JSX runtime evaluation.

Preferred order in `.test.ts`:

1. imports for assertions + `mainz/testing`
2. `setupMainzDom()`
3. dynamic TSX fixture import
4. tests

## Example

`jsx.example.test.ts`

```ts
/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { setupMainzDom } from "mainz/testing";

await setupMainzDom();

const domFactory = await import("../dom-factory.ts") as typeof import("../dom-factory.ts");
const fixtures = await import("./jsx.example.fixture.tsx") as typeof import("./jsx.example.fixture.tsx");

Deno.test("jsx/factory: should create class components and assign props", () => {
    const element = domFactory.h(fixtures.ExampleFactoryComponent, { label: "x" }) as HTMLElement & {
        props: Record<string, unknown>;
    };

    assertEquals(element.tagName, fixtures.ExampleFactoryComponent.getTagName().toUpperCase());
    assertEquals(element.props.label, "x");
});
```

`jsx.example.fixture.tsx`

```tsx
import { Component } from "mainz";

export class ExampleFactoryComponent extends Component<{ label?: string }, Record<string, never>> {
    override render(): HTMLElement {
        return <div data-label={this.props.label ?? "none"} />;
    }
}
```

## Naming Style

Use behavior-first names with group prefixes:

- `jsx/factory: ...`
- `jsx/runtime: ...`
- `jsx/integration: ...`
- `jsx/render-owner: ...`

## Fixture Convention

Use `*.fixture.tsx` as the default and only fixture format in this folder.

## Template Files

Use these files as the canonical starter when creating a new suite:

- `_template.test.ts`
- `_template.fixture.tsx`
