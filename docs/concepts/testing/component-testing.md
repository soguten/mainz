---
title: Component Testing
summary: Render Mainz components in a DOM-like test environment and assert behavior through the public testing helpers.
---

## Component tests should stay close to the DOM

Mainz components are custom elements. A good component test usually looks like:

1. set up the DOM once
2. render one component
3. interact through the DOM
4. assert visible output
5. cleanup

## Boot the test DOM

`setupMainzDom()` initializes the DOM-like environment used by the testing helpers.

```ts title="counter.test.ts"
import { setupMainzDom } from "mainz/testing";

await setupMainzDom();
```

Call it once near the top of the test module.

## Render a component

Use `renderMainzComponent()` to mount a Mainz component under a test root.

```tsx title="counter.test.ts"
import { assertEquals } from "@std/assert";
import { renderMainzComponent, setupMainzDom } from "mainz/testing";
import { CounterCard } from "./CounterCard.tsx";

await setupMainzDom();

Deno.test("counter increments on click", () => {
    const screen = renderMainzComponent(CounterCard, {
        props: { label: "Clicks" },
    });

    screen.click("button");
    screen.click("button");

    assertEquals(screen.getBySelector("button").textContent, "Clicks: 2");
    screen.cleanup();
});
```

## What `renderMainzComponent()` returns

The render result is intentionally small and DOM-oriented.

It exposes:

- `component`
- `host`
- `container`
- `getBySelector(selector)`
- `queryBySelector(selector)`
- `click(selector)`
- `dispatch(selector, event)`
- `input(selector, value)`
- `change(selector, value)`
- `cleanup()`

## Bootstrap options

`renderMainzComponent()` accepts a second argument with useful setup hooks:

- `props`
- `attrs`
- `stateOverride`

That makes it easy to cover cases that are painful in other setups.

### Props

```tsx
const screen = renderMainzComponent(ProfileCard, {
    props: { name: "Ada" },
});
```

### Attributes

```tsx
const screen = renderMainzComponent(ProfileCard, {
    attrs: { "data-mode": "compact" },
});
```

### Preloaded state

```tsx
const screen = renderMainzComponent(ProfileCard, {
    stateOverride: { expanded: true },
});
```

This is useful when you want to test a later UI state directly without simulating a long setup path
every time.

## Prefer DOM interactions over private methods

When possible, test components the same way a user or host page would:

- click a button
- type into an input
- dispatch a real event
- inspect rendered output

That keeps tests resilient and focused on behavior instead of implementation details.

## Async updates

If a component updates asynchronously, use `nextTick()` or normal `await` points before asserting.

```tsx
import { nextTick } from "mainz/testing";

screen.click("button[data-role='load']");
await nextTick();
```

For conditions that may take multiple turns, prefer `waitFor(...)`.

## Isolation and cleanup

Every rendered screen should call `cleanup()` when the test is done.

That keeps separate test surfaces isolated and avoids leaking DOM state across tests.

```ts
const screen = renderMainzComponent(MyComponent);

try {
    // assertions
} finally {
    screen.cleanup();
}
```

## When this approach is a good fit

Use component tests when you want fast feedback about:

- rendering
- state transitions
- event wiring
- input handling
- head updates at the component/page level

If the behavior depends on routing or full navigation runtime state, move up to runtime tests.
