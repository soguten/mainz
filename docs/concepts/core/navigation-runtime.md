---
title: Navigation Runtime
summary: Understand what SPA and MPA do in practice inside the browser.
---

## Two navigation modes

Mainz models navigation separately from render.

That gives you **SPA** and **MPA** as distinct runtime behaviors.

## Mainz `mpa` stays document-first

In Mainz, `mpa` keeps browser-native document navigation semantics.

Mainz also applies document-first runtime enhancements under `mpa`, such as
prefetching, scroll restoration, and progressive transitions where supported.

## The app bootstrap stays small

Because navigation mode comes from build context, the app bootstrap should not
need to parse URLs or decide runtime strategy manually.

For app definition, bootstrap, and the split between static and runtime
consumers, see [App Definition](./app-definition.md).

## Runtime lifecycle signals

Mainz now exposes a small navigation lifecycle vocabulary for managed runtime
navigation:

- `mainz:navigationstart`
- `mainz:navigationready`
- `mainz:navigationerror`
- `mainz:navigationabort`

The intended model is:

- `start -> ready`
- `start -> error`
- `start -> abort`

These events are emitted from the app mount/root and bubble upward. That means:

- single-app pages can observe them from `document` when convenient
- multi-app pages should prefer the specific app root

## What `navigationabort` means

`navigationabort` is a runtime navigation signal.

It means Mainz intentionally stopped a managed navigation because it was
superseded, cleaned up, or torn down before completion.

This signal is about navigation-owned runtime work such as:

- route matching and authorization flow
- `Page.load()` for the current navigation
- runtime DOM/head/locale application for that navigation

It is not the same thing as build or prerender cancellation.

## What `navigationabort` does not cover

This lifecycle does not currently describe build-time hooks such as `entries()`.

`entries()` belongs to SSG route expansion during build/prerender, not to
client/runtime navigation. A future build/prerender cancellation model may reuse
`AbortSignal`, but that would be a separate lifecycle from `navigationabort`.
