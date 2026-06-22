---
title: CLI
summary: Run Mainz targets through build, dev, preview, test, container, publish-info, and diagnose commands.
---

## App scaffolding

Use `mainz init` to prepare an empty repo for Mainz. It creates `deno.json` with
the Mainz import map and an empty `mainz.config.ts` ready to receive app
targets. Pass a name when you want Mainz to create a new project directory
first.

```bash
mainz init
mainz init my-app
mainz init --mainz jsr:@mainz/mainz@<version>
```

Use the installed CLI for bootstrap commands such as `init`. After the project
exists, prefer the generated project-local launcher:

- Deno projects: `deno task mainz ...`
- Node projects: `npm run mainz -- ...`

Use `--template starter` when you want a runnable example project with a routed
app and a counter component already wired into the home page.

```bash
mainz init my-app --template starter
cd my-app
deno task mainz dev --target app
```

Use the project-local launcher to create app workspaces and register targets.
When no template is passed, Mainz creates the default routed app scaffold with
`spa` navigation. `app create <name>` and `app create --name <name>` are both
accepted for naming the app.

```bash
deno task mainz app create --name site
deno task mainz app create site
deno task mainz app create docs --navigation mpa
deno task mainz app create portal --type root
deno task mainz app create admin --root ./apps/admin
deno task mainz app create docs --out-dir public/docs
deno task mainz app create docs --template default-routed
deno task mainz app create analytics --template chart
```

The default routed scaffold creates one source tree for the app:

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

Routed apps include `defineApp(...)`, `startApp(...)`, a pages directory, a home
page, and a not-found page. Use `--navigation mpa` only when you want that app
to start from an explicit non-default navigation mode. Use `--type root` for
the default root-mounted scaffold without routing pages.

Use `--template <name|source>` only when selecting an explicit app template or
template source. `--template` and `--type` are mutually exclusive because
`--type` only selects between the built-in default scaffolds. The template value
can be a built-in name, local path, absolute path, `file://` URL, or HTTP
template source.

Templates can declare runtime compatibility and dependencies. For example, the
built-in `chart` template adds Chart.js to the app workspace manifest. Deno
projects get a root `workspace` entry and an app-level `deno.json` with
dependency imports; Node projects get a root `workspaces` entry and an app-level
`package.json`.

`app create` also creates or updates `mainz.config.ts`:

```ts title="mainz.config.ts"
import { defineMainzConfig } from "mainz/config";

export default defineMainzConfig({
  targets: [
    {
      name: "site",
      rootDir: "./site",
      appFile: "./site/src/app.ts",
      appId: "site",
      outDir: "dist/site",
    },
  ],
});
```

Use the project-local launcher to remove targets. `app remove <target>` is also
accepted as a short form.

```bash
deno task mainz app remove --target site
deno task mainz app remove site
deno task mainz app remove site --delete-files
```

`remove` does not delete app files. It only removes the Mainz target wiring, so
the app directory stays available for manual cleanup or reuse. Add
`--delete-files` when you also want to delete the target's `rootDir`.

Use `--out-dir <path>` when the app should build somewhere other than
`dist/<name>`.

## Targets are the public CLI unit

Mainz CLI commands work from `mainz.config.ts`.

A target names one app workspace and the files Mainz needs to build, serve,
test, and diagnose it.

```ts title="mainz.config.ts"
import { defineMainzConfig } from "mainz/config";

export default defineMainzConfig({
  targets: [
    {
      name: "site",
      rootDir: "./site",
      appFile: "./site/src/app.ts",
      appId: "site",
      outDir: "dist/site",
    },
  ],
});
```

Use `--target <name>` when you want one target. Use `--target all` on commands
that support running across every target.

```bash
deno task mainz build --target site --profile production
deno task mainz dev --target site
deno task mainz preview --target site --profile production
deno task mainz test --target site
deno task mainz publish-info --target site --profile production
deno task mainz diagnose --target site --format human
```

## Build

`build` creates artifacts from the selected target.

```bash
deno task mainz build --target site --profile production
```

When `--target` is omitted, Mainz builds the production jobs it can derive from
all configured targets. Use `--target all` when a script should state that
intent explicitly.

Targets do not need a `vite.config.ts` file. Mainz generates the Vite config
from the target, build profile, and selected app. Keep `viteConfig` only for
advanced cases that need full Vite control.

## Dev

`dev` starts a Vite dev server for one target.

```bash
deno task mainz dev --target site
deno task mainz dev --target site --host
deno task mainz dev --target site --host 0.0.0.0 --port 5175
```

Dev uses the same target model and generated Vite defaults as build.

## Preview

`preview` builds one target and serves the resolved publication artifact.

```bash
deno task mainz preview --target site --profile production
deno task mainz preview --target site --profile production --host 127.0.0.1 --port 4173
```

The command reads publication metadata from the target profile, so scripts do
not need to know the exact `dist/<target>/...` artifact path.

## Test

`test` is intentionally project-shaped.

```bash
deno task mainz test
deno task mainz test --target site
deno task mainz test --target all
```

Without `--target`, it runs the project's normal Deno test suite. With
`--target <name>`, it runs tests discovered under that target's `rootDir`.

Framework-specific test buckets such as `fast`, `e2e`, or `smoke` belong in the
project's own `deno.json` tasks. They are not Mainz CLI options because every
project using Mainz owns a different test strategy.

## Publish Info

`publish-info` prints the resolved publication artifact metadata for one target.

```bash
deno task mainz publish-info --target site --profile production
```

Use this in deployment scripts when the host needs the final output directory or
public base path.

## Container

`mainz container` prepares and runs target-scoped Docker workflows.

Use `container init` when you want Mainz to scaffold the container files
for one target. The command resolves `production` first, then `development`,
and initializes both profiles with minimal defaults when neither exists yet.

```bash
deno task mainz container init --target site
deno task mainz container init --target site --profile production
```

`init` writes a target-local `Dockerfile`, updates the repository-root
`.dockerignore` for the Docker build context, resolves target-scoped `.env`
files, and selects the correct image shape automatically:

- browser-only targets produce a static web-server image
- server-capable targets produce a runtime image backed by Mainz publication
  artifacts

Use `container image build` when you want Mainz to call Docker with the
correct repository-root build context and tag the image for you.

```bash
deno task mainz container image build --target site
deno task mainz container image build --target site --tag my-site:dev
deno task mainz container build --target site
```

`mainz container build` is a short alias for `mainz container image build`.
When `--tag` is omitted, Mainz uses `<target>:local`.

Use `container run` when you want Mainz to run the local image with the
standard Mainz container port.

```bash
deno task mainz container run --target site
deno task mainz container run --target site --tag my-site:dev
deno task mainz container run --target site --port 3100
```

Mainz containers publish port `3000` internally for both browser-only and
server-capable targets. By default, `run` tries host port `3000`, then moves to
the next available port when needed. The command prints the final local URL,
such as [http://localhost:3000](http://localhost:3000) or
[http://localhost:3001](http://localhost:3001), before handing control to
Docker.

## Diagnose

`diagnose` runs framework diagnostics.

```bash
deno task mainz diagnose
deno task mainz diagnose --target site --format human
deno task mainz diagnose --target site --app site --fail-on error
```

Diagnostics can run across all targets or focus on one target and one app id.

## App-owned behavior

The CLI selects targets and profiles. The app definition owns app behavior.

That means:

- page render mode comes from `@RenderMode(...)`, with `csr` as the fallback
- navigation comes from `defineApp({ navigation })`, with `spa` as the fallback
- app ids, i18n, authorization policy names, services, commands, and pages live
  in `defineApp(...)`
- the selected app defines routed pages and `notFound`

The CLI does not expose navigation or render-mode override flags for normal use.
