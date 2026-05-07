---
title: Controllers And Coordinators
summary: Use DI-backed controllers or coordinators for stable app capabilities that outlive a single local render owner.
---

## Controllers are stable app capabilities

Some behavior in Mainz belongs to a stable app-level capability instead of a
single temporary component instance.

Common examples:

- opening and closing a drawer
- showing a search surface
- coordinating a multi-step flow
- holding UI state above one local subtree

That is a good fit for a controller or coordinator resolved through DI.

## Keep the split explicit

Mainz works best when each piece has a clear job:

- pages and components own render and local interaction
- commands name semantic actions
- controllers or coordinators own stable app behavior and state
- DI provides the stable instance per app

That keeps app-wide behavior out of short-lived local owners without hiding
everything behind a generic service layer.

## Register controllers through the app definition

Controllers should be registered like other app infrastructure:

```ts title="app.ts"
import { defineApp } from "mainz";
import { singleton } from "mainz/di";

export class DocsSearchController {
  private open = false;
  private initialQuery = "";

  show(initialQuery = "") {
    this.open = true;
    this.initialQuery = initialQuery;
  }

  hide() {
    this.open = false;
    this.initialQuery = "";
  }

  getState() {
    return {
      open: this.open,
      initialQuery: this.initialQuery,
    };
  }
}

export const app = defineApp({
  id: "docs-site",
  services: [singleton(DocsSearchController)],
});
```

Because DI is app-scoped, each started app gets its own controller instance.

## Components can read the same controller from different subtrees

One component can trigger the capability while another renders from the same
controller state:

```tsx title="SearchButton.tsx"
import { Component } from "mainz";
import { inject } from "mainz/di";

export class SearchButton extends Component {
  private readonly controller = inject(DocsSearchController);

  override render() {
    return (
      <button onClick={() => this.controller.show()}>
        Search
      </button>
    );
  }
}
```

```tsx title="SearchOverlay.tsx"
import { Component } from "mainz";
import { inject } from "mainz/di";

export class SearchOverlay extends Component {
  private readonly controller = inject(DocsSearchController);

  override render() {
    const state = this.controller.getState();

    return state.open ? <div>Search UI for {state.initialQuery}</div> : null;
  }
}
```

This is often cleaner than lifting everything into one large owner just to share
behavior.

## Commands often call controllers

Commands and controllers complement each other well.

The command is the semantic entry point:

- `docs.search.open`
- `main-drawer.open`
- `checkout.cancel`

The controller owns the long-lived implementation:

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

    services.get(DocsSearchController).show(initialQuery);
  },
});
```

That split keeps commands semantic and controllers durable.

## When to use one

Use a local component method when:

- the behavior belongs only to that owner
- no other subtree needs to coordinate with it
- the state should disappear with the owner

Use a controller or coordinator when:

- the capability is app-wide or shared
- multiple subtrees need to participate
- the behavior should outlive one local render branch

Use a command on top when:

- the same action should be reachable from keyboard, buttons, menus, or
  launcher-style UI

That combination gives Mainz a small but clear architecture for app-level UI
behavior.
