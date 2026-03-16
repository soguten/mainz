## Matrix tests protect the combinations

When a framework has independent axes like render mode and navigation mode, single-scenario tests stop being enough.

That is where matrix tests shine.

## Test the invariant, not just the feature

The useful question is often not “does feature X work?”

The better question is “does feature X still work across every supported combination?”

That is how you catch regressions where fixing `csr + spa` quietly breaks `ssg + enhanced-mpa`.
