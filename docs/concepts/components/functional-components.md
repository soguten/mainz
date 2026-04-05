---
title: Functional Components
summary: Use functions for composition, while class components remain the stateful runtime boundary.
---

## Functional components are composition helpers

In Mainz, a functional component is just a function that receives props and returns nodes.

It does not become a custom element instance, does not own lifecycle, and does not carry local
state.

```tsx title="Badge.tsx"
function Badge(props: { text: string }) {
    return <strong>{props.text}</strong>;
}
```

That makes functional components feel much closer to HTML helpers or partial templates than to
stateful application units.

## Class components are the stateful boundary

The stateful unit in Mainz is the class component:

- `Component` owns `state`
- `Component` owns lifecycle hooks like `onMount()` and `onUnmount()`
- `Component` is what becomes a Web Component instance

```tsx title="CounterPanel.tsx"
import { Component, type NoProps } from "mainz";

function Badge(props: { text: string }) {
    return <strong>{props.text}</strong>;
}

export class CounterPanel extends Component<NoProps, { count: number }> {
    protected override initState() {
        return { count: 0 };
    }

    override render() {
        return (
            <section>
                <button onClick={this.increment}>increment</button>
                <Badge text={String(this.state.count)} />
            </section>
        );
    }

    private increment = () => {
        this.setState({ count: this.state.count + 1 });
    };
}
```

`Badge` helps compose the DOM. `CounterPanel` owns the actual runtime behavior.

## This matches the Web platform shape

That split is intentional.

Plain HTML elements do not gain local state or lifecycle because you called a function that returned
them. Web Components do, because they are actual element instances with their own lifecycle.

Mainz leans into that platform boundary:

- functional components behave like composition helpers
- class components are Web Components

## This is not the same as React function components

React treats function components as first-class component units. They can own state through hooks
and participate directly in the reconciler as component boundaries.

Mainz does not do that.

In Mainz, the function is invoked during render and contributes markup to the current owner. The
nearest class component remains the real runtime boundary for state, lifecycle, and managed DOM
event ownership.
