# Test Conventions

Practical rules:

- local CLI tests stay in `src/cli/tests`
- cross-cutting tests that build artifacts and validate system behavior go in
  `tests/e2e`
- `core` and most `special` coverage should prefer test apps over real apps
- `smoke` should prefer real published targets such as `site` and `docs`
- use a real app outside `smoke` only when the published target behavior itself
  is the contract
- create a new test app only when an existing test app cannot cover the
  contract cleanly
- files in `tests/checks` should stay focused by domain
- files in `tests/helpers` should concentrate shared infrastructure
