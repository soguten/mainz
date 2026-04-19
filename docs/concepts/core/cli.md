---
title: CLI
summary: Run Mainz targets through build, dev, preview, test, publish-info, and diagnose commands.
---

## App scaffolding

Use `mainz app create --name <name>` to create an app workspace and register a target for it.
`mainz app create <name>` is also accepted as a short form.

```bash
mainz app create --name site
mainz app create site
mainz app create docs --navigation enhanced-mpa
mainz app create portal --type root
mainz app create admin --root ./apps/admin
mainz app create docs --out-dir public/docs
```

By default, Mainz creates one source tree for the app:

```txt
site/
  index.html
  src/
    app.ts
    main.tsx
    pages/
      Home.page.tsx
      NotFound.page.tsx
```

`--type routed` is the default. Routed apps include `defineApp(...)`, `startApp(...)`, a pages directory, a home page, and a not-found page. Use `--type root` for a root-mounted app without routing pages.

The command also creates or updates `mainz.config.ts`:

```ts title="mainz.config.ts"
import { defineMainzConfig } from "mainz/config";

export default defineMainzConfig({
    targets: [
        {
            name: "site",
            rootDir: "./site",
            appFile: "./site/src/app.ts",
            appId: "site",
            pagesDir: "./site/src/pages",
            outDir: "dist/site",
        },
    ],
});
```

Use `mainz app remove --target <target>` to remove the matching target from `mainz.config.ts`.
`mainz app remove <target>` is also accepted as a short form.

```bash
mainz app remove --target site
mainz app remove site
mainz app remove site --delete-files
```

`remove` does not delete app files. It only removes the Mainz target wiring, so the app directory stays available for manual cleanup or reuse. Add `--delete-files` when you also want to delete the target's `rootDir`.

Use `--out-dir <path>` when the app should build somewhere other than `dist/<name>`.

## Targets are the public CLI unit

Mainz CLI commands work from `mainz.config.ts`.

A target names one app workspace and the files Mainz needs to build, serve, test, and diagnose it.

```ts title="mainz.config.ts"
import { defineMainzConfig } from "mainz/config";

export default defineMainzConfig({
    targets: [
        {
            name: "site",
            rootDir: "./site",
            appFile: "./site/src/app.ts",
            appId: "site",
            pagesDir: "./site/src/pages",
            outDir: "dist/site",
        },
    ],
});
```

Use `--target <name>` when you want one target. Use `--target all` on commands that support running across every target.

```bash
mainz build --target site --profile production
mainz dev --target site
mainz preview --target site --profile production
mainz test --target site
mainz publish-info --target site --profile production
mainz diagnose --target site --format human
```

## Build

`mainz build` creates artifacts from the selected target.

```bash
mainz build --target site --profile production
```

When `--target` is omitted, Mainz builds the production jobs it can derive from all configured
targets. Use `--target all` when a script should state that intent explicitly.

Targets do not need a `vite.config.ts` file. Mainz generates the Vite config from the target, build
profile, and selected app. Keep `viteConfig` only for advanced cases that need full Vite control.

## Dev

`mainz dev` starts a Vite dev server for one target.

```bash
mainz dev --target site
```

Dev uses the same target model and generated Vite defaults as build.

## Preview

`mainz preview` builds one target and serves the resolved publication artifact.

```bash
mainz preview --target site --profile production
mainz preview --target site --profile production --host 127.0.0.1 --port 4173
```

The command reads publication metadata from the target profile, so scripts do not need to know the
exact `dist/<target>/...` artifact path.

## Test

`mainz test` is intentionally project-shaped.

```bash
mainz test
mainz test --target site
mainz test --target all
```

Without `--target`, it runs the project's normal Deno test suite. With `--target <name>`, it runs
tests discovered under that target's `rootDir`.

Framework-specific test buckets such as `fast`, `e2e`, or `smoke` belong in the project's own
`deno.json` tasks. They are not Mainz CLI options because every project using Mainz owns a different
test strategy.

## Publish Info

`mainz publish-info` prints the resolved publication artifact metadata for one target.

```bash
mainz publish-info --target site --profile production
```

Use this in deployment scripts when the host needs the final output directory or public base path.

## Diagnose

`mainz diagnose` runs framework diagnostics.

```bash
mainz diagnose
mainz diagnose --target site --format human
mainz diagnose --target site --app site --fail-on error
```

Diagnostics can run across all targets or focus on one target and one app id.

## App-owned behavior

The CLI selects targets and profiles. The app definition owns app behavior.

That means:

- page render mode comes from `@RenderMode(...)`, with `csr` as the fallback
- navigation comes from `defineApp({ navigation })`, with `spa` as the fallback
- app ids, i18n, authorization policy names, services, commands, and pages live in `defineApp(...)`

The CLI does not expose navigation or render-mode override flags for normal use.
