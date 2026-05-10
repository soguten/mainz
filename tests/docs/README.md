# Tests

This directory organizes the repository's cross-cutting test layer.

Quick map:

- `e2e/`: executable suites split into `core`, `special`, and `smoke`
- `checks/`: reusable domain validations used by the E2E suites
- `helpers/`: shared execution and build infrastructure for tests
- `test-apps/`: minimal apps used to validate framework contracts intentionally
- `docs/`: internal documentation for test architecture and conventions

Recommended reading:

- `tests/docs/architecture.md`
- `tests/docs/conventions.md`
- `tests/docs/testing-matrix.md`
