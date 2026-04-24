# @mainz/cli-deno

Deno-hosted Mainz tooling package.

This package exposes:

- the Deno Mainz CLI entrypoint
- the Deno tooling runtime adapter
- shared scaffold builders used by `mainz init` and `mainz app create`

Suggested global install when you want this CLI to coexist with other Mainz host CLIs:

```bash
deno install -A -g -f -n mainz-deno jsr:@mainz/cli-deno
```

Typical usage:

```ts
import { denoToolingRuntime } from "@mainz/cli-deno";
```
