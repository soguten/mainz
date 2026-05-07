---
title: Head and SEO
summary: Let Mainz manage canonical, hreflang, and page metadata without head duplication.
---

## Head should not duplicate

Mainz manages page-owned head tags so canonical links, hreflang entries, and
metadata stay synchronized across build and hydration.

That avoids a common failure mode where the build emits one thing and the client
appends another copy after boot.

## SEO follows the route manifest

Because SEO data is derived from the route manifest, features like locale-aware
canonical URLs and alternate links stay consistent across the mode matrix.
