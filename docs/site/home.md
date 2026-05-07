---
id: home
pageTitle: Mainz Docs
description: Documentation-style demo for Mainz with page-first routing, dynamic docs routes, and theme support.
title: Build documentation that feels like a product
summary: Docs is a Mainz demo that leans into a familiar docs layout while dogfooding page-first routing, dynamic entries, and runtime data loading.
statusLabel: Mainz demo
---

## What this demo proves

The layout is intentionally recognizable as a documentation site, but the
runtime model stays Mainz: pages own routes, the build owns artifacts, and the
app entry stays tiny.

This demo also exercises dynamic routes through `/:slug`, which now expand
through `entries()` while article components assemble their own content through
`Component.load()`.

The docs article route now uses `@RenderMode("ssg")`, `@Locales("en")`, and a
component-level `@RenderStrategy("blocking")` so the page owns routing while the
article component owns async assembly.

The right rail reintroduces **On this page** as a `defer` component with
`placeholder()`, and article pages now show **Recent pages** in the sidebar as a
`blocking` component plus `@RenderPolicy("placeholder-in-ssg")` so SSG emits
placeholder UI while browser state stays client-driven.

The diagnostics story is CLI-first: `mainz diagnose` now reuses the same
framework diagnostics core for terminal use and CI without depending on one
editor integration.

## Start with these pages

Open **Quickstart** for the minimal page model, **Routing Modes** for the
render-versus-navigation split, **Diagnostics CLI** for the rule engine surface,
and **Dynamic Routes** to see the new contract in practice.
