---
title: Head and SEO
summary: Let Mainz manage canonical, hreflang, and page metadata without head duplication.
---

## Head should not duplicate

Mainz manages page-owned head tags so canonical links, hreflang entries, and
metadata stay synchronized across build and hydration.

That avoids a common failure mode where the build emits one thing and the client
appends another copy after boot.

## Metadata and assets are different concerns

In Mainz, `metadata()` is intentionally narrow.

Use it for:

- document title
- SEO metadata
- canonical and alternate links

Do not treat it as a general script, stylesheet, or inline style injection API.

When a route needs route-scoped scripts or other document assets, use
`assets()`.

When every route in the app needs the same asset, prefer `defineApp({ assets })`.
That includes shared scripts, `preconnect` hints, and shared font stylesheets.

For the full document injection model, including precedence and conditional
rules, see [Assets](../core/assets.md).

## SEO follows the route manifest

Because SEO data is derived from the route manifest, features like locale-aware
canonical URLs and alternate links stay consistent across the mode matrix.
