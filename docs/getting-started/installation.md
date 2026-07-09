---
title: Installation
summary: Set up Mainz in a repo and understand the minimum moving pieces.
---

## Install the toolchain

Mainz leans on Deno and Vite, so the setup is intentionally small.

If your repo already uses Deno tasks, Mainz fits in cleanly without an extra
package manager layer.

Use the global CLI for bootstrap:

```bash title="Bootstrap a Project"
mainz init
```

After that, use the generated project-local launcher.

For Deno projects:

```bash title="Deno Project Commands"
deno task mainz app create site
deno task mainz dev --target site
```

Or start from a runnable example app:

```bash title="Deno Starter Project"
mainz init my-app --template starter
cd my-app
deno task mainz dev --target app
```

For Node projects:

```bash title="Node Starter Project"
mainz init my-node-app --runtime node --template starter
cd my-node-app
npm install
npm run mainz -- dev --target app
```

## Use the generated Vite config

Normal Mainz targets do not need a `vite.config.ts` file. Mainz generates the
Vite config from the selected target and app, including JSX setup, framework
aliases, build output, base path, and the app navigation mode.

Use `target.vite` for small app-specific additions that should still live inside
the generated config.

```ts title="mainz.config.ts"
import { defineMainzConfig } from "mainz/config";

export default defineMainzConfig({
  targets: [
    {
      name: "site",
      rootDir: "./site",
      appFile: "./site/src/main.tsx",
      appId: "site",
      outDir: "dist/site",
      vite: {
        alias: {
          "@site/": "./site/src/",
        },
        define: {
          __APP_VERSION__: JSON.stringify("local"),
        },
      },
    },
  ],
});
```

`target.vite.alias` cannot replace Mainz framework imports such as `mainz` or
`mainz/i18n`, and `target.vite.define` cannot replace Mainz runtime values such
as `__MAINZ_NAVIGATION_MODE__` and `__MAINZ_BASE_PATH__`.

## Materialize a managed Vite config

For advanced cases, materialize Mainz's managed Vite config instead of keeping
an arbitrary hand-written Vite file. This preserves the Mainz-owned Vite
runtime while still giving the project an inspectable config file.

```ts title="mainz.config.ts"
import { defineMainzConfig } from "mainz/config";

export default defineMainzConfig({
  targets: [
    {
      name: "site",
      rootDir: "./site",
      appFile: "./site/src/main.tsx",
      appId: "site",
      outDir: "dist/site",
    },
  ],
});
```

Generate the managed config with:

```bash
deno task mainz vite materialize --target site
```

That writes `./site/vite.config.ts` and `./site/.mainz/vite-runtime.ts`.
The generated config imports from the Mainz-managed helper surface instead of
depending on a project-owned `vite` install.

Use `target.vite` for common aliases and defines. Use materialization when the
target needs to inspect or edit the managed Vite config directly.

## Add a target

Targets are how Mainz understands that a repo can host multiple apps.

That means a docs app, a playground, and a marketing site can all share one
framework workspace without pretending to be the same product.
