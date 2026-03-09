# Mainz Component Testing Guide

This folder defines a small set of conventions used to keep Mainz component tests consistent, readable, and easy to maintain.

## Test file structure

A test suite typically follows this structure:

1. `/// <reference lib="deno.ns" />`
2. short suite-level comment explaining:
   - what is being tested
   - why it matters
3. imports
4. `setupMainzDom()`
5. dynamic fixture import
6. tests with descriptive names

## Example

```component.example.test.ts```

```ts
/// <reference lib="deno.ns" />

/**
 * Button interaction tests
 *
 * Ensures that clicking a button updates the component state.
 */

import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";

setupMainzDom();

const fixtures = await import("./button.fixture.tsx") as typeof import("./button.fixture.tsx");

Deno.test("button: should increment count when clicked", () => {
    const screen = renderMainzComponent(fixtures.CounterComponent);

    screen.click("button");
    screen.click("button");

    assertEquals(screen.getBySelector("button").textContent, "2");

    screen.cleanup();
});

```
```component.example.fixture.tsx```

```ts
import { Component } from "mainz";

export class ExampleComponent extends Component<{}, { count: number }> {
    protected override initState() {
        return { count: 0 };
    }

    override render(): HTMLElement {
        return (
            <button type="button" onClick={() => this.setState({ count: this.state.count + 1 })}>
                {String(this.state.count)}
            </button>
        );
    }
}
```

## File layout

Each test suite is usually split into two files:

`*.test.ts` the test runner

`*.fixture.ts` or `*.fixture.tsx` helper components used in the tests

Fixtures are placed next to their corresponding test file unless they are shared.

## Example:

```
component.render-owner.test.ts
component.render-owner.fixture.tsx
```

## Test naming

Test names should read like behavior statements.

Examples:

```
counter: should increment when button is clicked
button: should trigger click handler
toggle: should switch state when clicked
```

This style helps the test output read like documentation.

## Suite comments

Each test file should start with a short suite comment.

The comment should contain:

1. a short suite title
2. one or two sentences explaining the behavior being verified

Preferred format:

```
/**
* Attribute tests
*
* Verifies that component attributes are accessible during lifecycle
* 
* and correctly applied, updated, and removed during rendering.
*/
```


##  When to use fixtures

Use a fixture file when:

* the suite needs TSX for readability

* the same component is used in multiple tests

* inline component declarations make the test harder to read

* the test depends on delayed module loading

## Why test files stay in `.ts`

The test environment requires `setupMainzDom()` to run before modules that depend on `HTMLElement`, `document`, or the JSX runtime are evaluated.

Keeping the main test file in `.ts` allows this order:

1. import test helpers

2. call `setupMainzDom()`

3. dynamically import fixtures

4. run tests

This avoids loading DOM-dependent modules too early.

## Why fixtures may use `.tsx`

Fixtures often represent real component usage scenarios.

Using TSX in fixture files makes these scenarios easier to read and closer to
how components are written in production.