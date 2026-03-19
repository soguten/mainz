## Components are the runtime building block

`Component` is the base class for Mainz UI primitives.

Pages extend that same component model, but regular components let you compose the interface without
attaching route metadata to every class.

```tsx title="CounterCard.tsx"
import { Component, CustomElement } from "mainz";

interface CounterState {
    count: number;
}

@CustomElement("ui-counter-card")
export class CounterCard extends Component<{}, CounterState> {
    protected override initState(): CounterState {
        return { count: 0 };
    }

    override render() {
        return <button>{String(this.state.count)}</button>;
    }
}
```

## Props, state, and render stay on one class

The model is intentionally direct:

- `props` receive input from JSX or the runtime
- `state` holds local mutable UI state
- `render()` returns the current DOM shape
- `initState()` bootstraps state before the first render

That keeps component behavior local instead of splitting logic across hooks, templates, and external
config.

## Components compose pages

Pages usually own route and head metadata, while components own reusable UI pieces.

That means a page can stay focused on route behavior and data loading, while the rest of the screen
is built from plain `Component` subclasses.

Functional components also exist in Mainz, but they are composition helpers rather than stateful
runtime units. When the distinction matters, remember that class components are Web Components,
while function components are render helpers.

## Reach for a page only when the URL matters

A good rule of thumb is simple:

- use `Page` when the class owns a route
- use `Component` when the class owns reusable interface behavior

Because both inherit from the same runtime model, moving a UI idea from a page subtree into a
reusable component stays straightforward.
