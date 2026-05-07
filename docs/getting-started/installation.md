---
title: Installation
summary: Set up Mainz in a repo and understand the minimum moving pieces.
---

## Install the toolchain

Mainz leans on Deno and Vite, so the setup is intentionally small.

If your repo already uses Deno tasks, Mainz fits in cleanly without an extra
package manager layer.

```bash title="Install and run"
mainz init
mainz app create site
mainz dev --target site
```

Or start from a runnable example app:

```bash title="Starter project"
mainz init my-app --template starter
mainz dev --target app
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
as `__MAINZ_RENDER_MODE__`.

## Use a custom Vite config

For advanced cases, keep a hand-written Vite config and point the target at it
with `viteConfig`. When `viteConfig` is present, Mainz uses that file instead of
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
      viteConfig: "./site/vite.config.ts",
    },
  ],
});
```

Keep Mainz-owned values wired through the environment variables passed during
`mainz build`.

```ts title="site/vite.config.ts"
import { defineConfig } from "vite";

const navigationMode = process.env.MAINZ_NAVIGATION_MODE ?? "spa";

export default defineConfig({
  appType: navigationMode === "spa" ? "spa" : "mpa",
  base: process.env.MAINZ_BASE_PATH ?? "./",
  define: {
    __MAINZ_RENDER_MODE__: JSON.stringify(
      process.env.MAINZ_RENDER_MODE ?? "csr",
    ),
    __MAINZ_NAVIGATION_MODE__: JSON.stringify(navigationMode),
    __MAINZ_TARGET_NAME__: JSON.stringify(
      process.env.MAINZ_TARGET_NAME ?? "site",
    ),
    __MAINZ_BASE_PATH__: JSON.stringify(process.env.MAINZ_BASE_PATH ?? "./"),
    __MAINZ_APP_LOCALES__: process.env.MAINZ_APP_LOCALES ?? "[]",
    __MAINZ_DEFAULT_LOCALE__: JSON.stringify(
      process.env.MAINZ_DEFAULT_LOCALE || undefined,
    ),
    __MAINZ_LOCALE_PREFIX__: JSON.stringify(
      process.env.MAINZ_LOCALE_PREFIX ?? "except-default",
    ),
    __MAINZ_SITE_URL__: JSON.stringify(process.env.MAINZ_SITE_URL || undefined),
  },
  esbuild: {
    keepNames: true,
    jsx: "automatic",
    jsxImportSource: "mainz",
  },
});
```

## Add a target

Targets are how Mainz understands that a repo can host multiple apps.

That means a docs app, a playground, and a marketing site can all share one
framework workspace without pretending to be the same product.
