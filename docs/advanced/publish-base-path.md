## Base paths need real coverage

Publishing under a subpath changes more than links.

It affects:

- canonical URLs
- hreflang output
- root redirects
- localized routing
- preview behavior
- asset resolution

## Treat base-path publishing as first-class

If a framework says it supports publication under a path prefix, it should prove that support with
explicit build and preview coverage instead of assuming `/`.

## Separate the framework profile from the hosting provider

In Mainz, the framework concept is the `publish` profile.

That profile represents publication concerns such as:

- `siteUrl`
- `basePath`
- publish-oriented SEO output

That is different from the hosting provider itself.

For example:

- GitHub Pages is one possible destination
- any static host serving a site under a prefix is another

The framework should model the publication contract, not the platform brand.

## GitHub Pages is just one example

GitHub Pages is still a useful real-world target because it commonly exercises:

- root publishing for the main site
- subpath publishing for docs

But the underlying behavior being tested is broader:

- publication with `siteUrl`
- publication with `basePath`
- localized routing under a prefix
- SEO output that respects the published URL shape

## Good test names describe behavior

When tests cover this area, names should prefer the observed contract:

- publication base path
- absolute SEO links from `siteUrl`
- localized routing under a prefix

That is usually better than naming the test after a specific hosting provider.
