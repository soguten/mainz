---
title: Component Model
summary: Understand how Component, props, state, and render fit together before page-specific concerns.
---

## Components are the runtime building block

`Component` is the base class for Mainz UI primitives.

Pages extend that same component model, but regular components let you compose
the interface without attaching route metadata to every class.

```tsx title="CounterCard.tsx"
import { Component, type NoProps } from "mainz";

interface CounterState {
  count: number;
}

export class CounterCard extends Component<NoProps, CounterState> {
  protected override initState(): CounterState {
    return { count: 0 };
  }

  override render() {
    return <button>{String(this.state.count)}</button>;
  }
}
```

## Generic order and utility types

`Component` uses the generic order `Component<Props, State, Data>`.

Mainz also exports a few utility types to make common cases easier to read:

- `NoProps` for components that should not accept any props, including
  `children`
- `NoState` for components that do not use local state
- `ChildrenOnlyProps` for wrapper components that only accept JSX children

```tsx
import {
  type ChildrenOnlyProps,
  Component,
  type NoProps,
  type NoState,
} from "mainz";

class Badge extends Component<{ tone: string }> {}

class CounterCard extends Component<NoProps, { count: number }> {}

class RelatedDocs extends Component<{ slug: string }, NoState, DocsModel> {}

class Card extends Component<ChildrenOnlyProps> {
  override render() {
    return <section>{this.props.children}</section>;
  }
}
```

When a component has no local state and does not need `Data`, you can still omit
the second slot:

```tsx
class Badge extends Component<{ tone: string }> {}
```

## Props, state, and render stay on one class

The model is intentionally direct:

- `props` receive input from JSX or the runtime
- `state` holds local mutable UI state
- `render()` or `render(data)` returns the current DOM shape
- `initState()` bootstraps state before the first render
- `load(context)` can own async component assembly
- `Component.load()` defaults to `blocking` unless the component opts into
  another `@RenderStrategy(...)`

That keeps component behavior local instead of splitting logic across hooks,
templates, and external config.

If the component needs infrastructure such as an API gateway or HTTP client,
resolve that through `mainz/di` with `inject(Token)` rather than putting
technical dependencies into `props`. See
[Dependency Injection](../core/dependency-injection.md).

When a component implements `load(context)`, Mainz now passes `context.signal`.

That signal is aborted when:

- the component starts a fresher load because props changed
- the component disconnects before the current load settles

This keeps component-owned async work cooperative with cancellation and prevents
stale results from becoming the rendered state later.

When a component declares `load(context)`, `render(data)` is the preferred
explicit way to consume that resolved value. `this.data` still remains available
when helper methods or lifecycle members need the same data outside `render()`.

That behavior also composes across subtrees:

- sibling deferred components each keep their own load attempt and abort signal
- a newer parent-driven rerender aborts each stale child load independently
- one child hitting a real error fallback does not turn an aborted sibling into
  an error

## Component props are not the same as host attributes

When JSX renders a Mainz class component, two things can happen at once:

- the component instance receives structured `props`
- the custom element host can receive a small set of explicit host attributes

Those are related, but they are not the same contract.

Mainz keeps arbitrary component props on `this.props`. It does not mirror every
primitive prop onto the host element.

That means values such as these stay plain component props by default:

- `state`
- `value`
- `checked`
- `count`
- domain props such as `variant`, `tone`, `slug`, or `itemId`

If a class component needs those values, read them from `this.props`, not from
`getAttribute(...)`.

## Which host attributes are forwarded

Mainz still forwards a deliberate host-attribute subset for class components so
host-level semantics stay available.

This includes:

- normalized host props such as `className` and `tabIndex`
- standard host attributes such as `id`, `title`, `role`, `slot`, `part`,
  `hidden`, `lang`, `dir`, `style`, and related global host values
- any `data-*` attribute
- any `aria-*` attribute

Examples:

```tsx
<Card
  className="card"
  style="border: 1px solid var(--line);"
  tabIndex={0}
  role="region"
  data-state="ready"
  aria-label="Account card"
  variant="subtle"
/>;
```

In that example:

- `className`, `style`, `tabIndex`, `role`, `data-state`, and `aria-label`
  forward to the custom element host
- `variant` remains only `this.props.variant`

This keeps host semantics explicit without turning every primitive component
prop into public DOM surface area.

## Components compose pages

Pages usually own route and head metadata, while components own reusable UI
pieces.

That means a page can stay focused on route behavior and data loading, while the
rest of the screen is built from plain `Component` subclasses.

Functional components also exist in Mainz, but they are composition helpers
rather than stateful runtime units. When the distinction matters, remember that
class components are Web Components, while function components are render
helpers.

## Reach for a page only when the URL matters

A good rule of thumb is simple:

- use `Page` when the class owns a route
- use `Component` when the class owns reusable interface behavior

Because both inherit from the same runtime model, moving a UI idea from a page
subtree into a reusable component stays straightforward.
