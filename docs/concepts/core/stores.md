---
title: Stores
summary: Use DI-backed stores for stable app-scoped UI state that outlives a single local render owner.
---

## Stores own shared app state

Some behavior in Mainz belongs to a stable app-level capability instead of a
single temporary component instance.

Common examples:

- opening and closing a drawer
- showing a search surface
- holding session state above one local subtree
- sharing multi-step flow state across multiple components

That is a good fit for a `Store` resolved through DI.

## Keep the split explicit

Mainz works best when each piece has a clear job:

- pages and components own render and local interaction
- commands name semantic actions
- stores own stable app-visible state and actions
- services load and persist data
- DI provides one stable app-scoped instance

That keeps app-wide behavior out of short-lived local owners without hiding
everything behind a generic service layer.

## Register stores through the app definition

Stores should be registered like other app infrastructure:

```ts title="app.ts"
import { defineApp, Store } from "mainz";
import { singleton } from "mainz/di";

type DocsSearchState = {
  open: boolean;
  initialQuery: string;
};

export class DocsSearchStore extends Store<DocsSearchState> {
  protected override initState(): DocsSearchState {
    return {
      open: false,
      initialQuery: "",
    };
  }

  show(initialQuery = "") {
    this.state = {
      open: true,
      initialQuery,
    };
  }

  hide() {
    this.state = {
      open: false,
      initialQuery: "",
    };
  }
}

export const app = defineApp({
  id: "docs-site",
  services: [singleton(DocsSearchStore)],
});
```

Because DI is app-scoped, each started app gets its own store instance.

## Components can use the same store from different subtrees

One component can trigger the capability while another renders from the same
store state.

Action-only usage stays simple:

```tsx title="SearchButton.tsx"
import { Component } from "mainz";
import { inject } from "mainz/di";

export class SearchButton extends Component {
  private readonly search = inject(DocsSearchStore);

  override render() {
    return (
      <button onClick={() => this.search.show()}>
        Search
      </button>
    );
  }
}
```

When a component renders from store state, bind it:

```tsx title="SearchOverlay.tsx"
import { Component } from "mainz";
import { inject } from "mainz/di";

export class SearchOverlay extends Component {
  private readonly search = inject(DocsSearchStore).bind(this);

  override render() {
    if (!this.search.state.open) {
      return null;
    }

    return (
      <div>
        <button onClick={() => this.search.hide()}>
          Close
        </button>

        Search UI for {this.search.state.initialQuery}
      </div>
    );
  }
}
```

`.bind(this)` tells Mainz to rerender that component when the store state
changes. The component still reads directly from `store.state`; Mainz does not
mirror that state into component state.

## Commands often call stores

Commands and stores complement each other well.

The command is the semantic entry point:

- `docs.search.open`
- `main-drawer.open`
- `checkout.cancel`

The store owns the long-lived implementation:

```ts title="commands.ts"
import { defineCommand } from "mainz";

export const openDocsSearchCommand = defineCommand({
  id: "docs.search.open",
  title: "Search documentation",
  shortcuts: ["Mod+K"],
  execute: ({ payload, services }) => {
    const initialQuery = typeof payload === "object" &&
        payload !== null &&
        "initialQuery" in payload &&
        typeof payload.initialQuery === "string"
      ? payload.initialQuery
      : "";

    services.get(DocsSearchStore).show(initialQuery);
  },
});
```

That split keeps commands semantic and stores durable.

## Use stores only for shared app-visible state

Use a local component method or component state when:

- the behavior belongs only to that owner
- no other subtree needs to coordinate with it
- the state should disappear with the owner

Use a store when:

- the capability is app-wide or shared
- multiple subtrees need to participate
- the state should outlive one local render branch
- the UI should render from one stable app-scoped owner

Use a command on top when:

- the same action should be reachable from keyboard, buttons, menus, or
  launcher-style UI

That gives Mainz one clear public architecture for shared UI state:

- `Component` renders
- `Store` owns shared app state and actions
- `Service` performs data and infrastructure work
