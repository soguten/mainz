# @mainz/cli-node

Node-hosted Mainz CLI and tooling primitives.

This package exposes:

- the shared `main(...)` CLI entrypoint for Node-hosted execution
- the Node tooling runtime adapter
- scaffold builders used by Mainz project and app generation

When this package hosts the CLI, Mainz assumes `runtime: "node"` by default for new projects.
`--runtime` remains available as an explicit override.

Typical usage:

```ts
import { main, nodeToolingRuntime } from "@mainz/cli-node";

await main(["init"], { hostRuntime: "node" });
```
