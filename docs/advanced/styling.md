---
title: Styling and Theme
summary: Build a bold docs interface without giving up static output or progressive enhancement.
---

## Theme is app-level today

Mainz does not ship a first-party theme manager yet, but it stays out of your way.

A docs app can own light and dark themes with CSS variables and a tiny toggle component.

Because the app keeps ownership of theme state, you can choose localStorage, `prefers-color-scheme`, cookies, or a future server-driven approach.

## Docs layout with a Mainz touch

A strong docs layout usually wants a sidebar, a clear top bar, and excellent code examples.

The point is not to look unlike docs. The point is to look intentional instead of generic.
