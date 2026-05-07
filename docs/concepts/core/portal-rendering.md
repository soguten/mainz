---
title: Portal Rendering
summary: Render overlays outside their local DOM position while keeping Mainz ownership and app isolation.
---

## Portal moves placement, not ownership

`Portal` lets a component declare UI in one logical place and mount it into a
managed DOM layer somewhere else.

Use it for overlays that should not be trapped by local layout containers:

- dialogs
- command palettes
- popovers
- toast containers
- floating menus that need to escape `overflow`, `transform`, or local `z-index`

```tsx title="SearchDialog.tsx"
import { Component, Portal } from "mainz";

export class SearchDialog extends Component<{}, { open: boolean }> {
  protected override initState() {
    return { open: false };
  }

  override render() {
    return (
      <div>
        <button onClick={() => this.setState({ open: true })}>
          Search
        </button>

        {this.state.open
          ? (
            <Portal>
              <div role="dialog" aria-modal="true">
                Search the site
              </div>
            </Portal>
          )
          : null}
      </div>
    );
  }
}
```

The rendered dialog is mounted into a portal layer, but the declaring component
still owns the DOM and event handlers created inside that portal.

## App-scoped layers are the default

By default, `Portal` uses:

```tsx
<Portal scope="app" layer="overlay">
  ...
</Portal>;
```

`startApp(...)` prepares the app boundary and the default `overlay` layer.
Application code does not need to create that layer manually.

Layer names are scoped to the current Mainz app. That means two apps on the same
document can both use `layer="overlay"` without sharing DOM:

```tsx
<Portal layer="overlay">
    <Dialog />
</Portal>

<Portal layer="toast">
    <Toast />
</Portal>
```

The runtime creates additional named app layers lazily when a portal asks for
them.

## Document scope is explicit

Use `scope="document"` only when an overlay should participate in a
document-level layer shared by multiple apps:

```tsx
<Portal scope="document" layer="overlay">
  <GlobalDialog />
</Portal>;
```

Document-scoped portals stack by mount/open order. `Portal` does not coordinate
exclusivity, focus arbitration, or "only one modal may be open" rules across
apps. If you need that, build it in a higher-level app policy or overlay
manager.

## Explicit targets are CSR-only

Advanced callers can pass a browser-owned element:

```tsx
<Portal target={overlayElement}>
  <Popover />
</Portal>;
```

This is a client-side escape hatch. During SSG there is no browser `HTMLElement`
to target, so use it only for runtime-only UI.

## SSG behavior is conservative

Closed overlays should not render portal content.

During SSG build, Mainz omits portal content from the resolved layer. This keeps
generated HTML predictable for common overlay patterns such as command palettes
and dialogs that start closed.

If you need an always-open piece of UI to be present in generated HTML, prefer
rendering it in the normal document flow instead of a portal.

## Accessibility belongs to the higher-level pattern

`Portal` is not itself a modal or focus-trap abstraction.

It only controls where DOM is mounted. The component or pattern using it should
still handle:

- `role="dialog"` or a more specific semantic role
- `aria-modal`
- focus placement
- `Escape`
- click outside behavior
- background inertness when needed

This keeps `Portal` small and lets UI libraries such as Typecase build
opinionated patterns on top.
