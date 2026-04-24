# @mainz/platform-deno

Deno-hosted Mainz tooling package.

This package exposes:

- the Deno Mainz CLI entrypoint
- the Deno tooling platform adapter
- shared scaffold builders used by `mainz init` and `mainz app create`

Typical usage:

```ts
import { denoToolingPlatform } from "@mainz/platform-deno";
```
