# @mainz/runtime-deno

Deno-hosted Mainz tooling package.

This package exposes:

- the Deno Mainz CLI entrypoint
- the Deno tooling runtime adapter
- shared scaffold builders used by `mainz init` and `mainz app create`

Typical usage:

```ts
import { denoToolingRuntime } from "@mainz/runtime-deno";
```
