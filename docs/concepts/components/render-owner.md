## Render owner is the component currently rendering

Mainz tracks the current class component while `render()` runs.

That current component is the **render owner**.

Internally, the runtime pushes the component before render and pops it afterward. JSX event binding
can then ask, "which Mainz component owns the DOM node being created right now?"

## Why this exists

Functional components in Mainz do not own lifecycle or listener cleanup.

But they can still return DOM with event handlers:

```tsx title="FunctionalAction.tsx"
function FunctionalAction(props: { onAction: () => void; label: string }) {
    return <button onClick={props.onAction}>{props.label}</button>;
}
```

If a class component renders `FunctionalAction`, the button still needs to be owned by something so
listener teardown works on rerender and unmount.

That owner is the nearest rendering class component.

## What the owner actually does

When JSX sees an `onClick`, `onInput`, or similar prop on a real DOM element, it registers that
listener under the current render owner instead of treating the listener as anonymous global state.

That gives Mainz a concrete place to:

- track DOM listeners created during render
- replace them correctly during patching
- remove them when the owning component unmounts
- keep separate roots isolated from each other

## Example: functional child, class owner

```tsx title="OwnerExample.tsx"
import { Component, CustomElement, type NoProps } from "mainz";

function SaveButton(props: { onSave: () => void; label: string }) {
    return <button onClick={props.onSave}>{props.label}</button>;
}

@CustomElement("app-owner-example")
export class OwnerExample extends Component<NoProps, { count: number }> {
    protected override initState() {
        return { count: 0 };
    }

    override render() {
        return (
            <SaveButton
                label={String(this.state.count)}
                onSave={() => this.setState({ count: this.state.count + 1 })}
            />
        );
    }
}
```

`SaveButton` returns the button, but `OwnerExample` is still the render owner of that DOM and of the
managed click listener.

## How this differs from React

React function components are first-class component boundaries inside the reconciler. They can own
hooks, effects, and stateful behavior without needing a class component around them.

Mainz is different:

- function components are plain render functions
- class components are the runtime ownership boundary
- render owner bridges composition and cleanup by attaching DOM listener ownership to the nearest
  class component render

So the comparable idea in React is not "render owner" as an explicit public concept. React hides
ownership inside Fiber and its reconciler model.

Mainz exposes a smaller and more platform-shaped model: the class component that is rendering right
now owns the DOM work created in that render pass.

## Why this matters for framework users

You usually do not need to think about render owner while writing normal components.

But it explains several important Mainz behaviors:

- events created inside functional children still clean up correctly
- nested roots stay isolated
- parent rerenders do not accidentally steal child listener ownership
- render failures can unwind without leaving stale owner state behind

That makes `render owner` a useful internal concept to understand, even if most application code
does not touch it directly.
