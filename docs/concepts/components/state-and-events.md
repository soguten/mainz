## State starts with `initState()`

Mainz components can preload local state before the first render with `initState()`.

```tsx title="ToggleCard.tsx"
import { Component, CustomElement, type NoProps } from "mainz";

interface ToggleState {
    open: boolean;
}

@CustomElement("ui-toggle-card")
export class ToggleCard extends Component<NoProps, ToggleState> {
    protected override initState(): ToggleState {
        return { open: false };
    }

    override render() {
        return (
            <button onClick={this.toggle}>
                {this.state.open ? "Open" : "Closed"}
            </button>
        );
    }

    private toggle = () => {
        this.setState({ open: !this.state.open });
    };
}
```

## `setState()` rerenders the host

`setState()` merges the partial update into the current state and rerenders the component when it is
connected.

That gives you a small, predictable model for interactive UI without introducing extra scheduling
concepts into every component.

## DOM events work well inline or imperatively

Most components can attach events inline in JSX, like `onClick={this.toggle}`.

For host-level or global listeners, lifecycle methods can register events more explicitly:

```tsx title="ResizeAware.tsx"
override onMount(): void {
  this.registerDOMEvent(window, "resize", this.handleResize);
}
```

That registration is tracked so Mainz can clean it up when the component unmounts.

## Attributes and props are related, but not identical

Mainz syncs standard DOM attributes on host elements, while component instances receive structured
`props`.

That split is useful because reusable components often want object-shaped input, but plain DOM nodes
still need normal attribute updates like `class`, `value`, `checked`, and `selected`.

## This area can grow

This page is the base layer for component state and event behavior.

Good follow-up additions later would be keyed patching, render owner behavior, and lifecycle
guarantees for async state updates.
