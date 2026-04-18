## One app definition, multiple consumers

Mainz separates app definition from app execution.

The clean mental model is:

- `defineApp(...)` = definition
- build and diagnostics = static consumers of that definition
- `startApp(...)` = runtime consumer of that definition

That means:

- `defineApp(...)` describes what the app is
- build reads that definition to discover pages, services, and prerender inputs
- diagnostics read that definition to validate routing, DI, and other static contracts
- `startApp(...)` mounts that definition into a real runtime with options such as `mount` and `auth`

This separation helps Mainz keep one official composition root for:

- runtime startup
- build-time expansion
- static diagnostics

## Routed apps

Routed apps should prefer an explicit shared app definition:

```tsx title="app.ts"
import { defineApp } from "mainz";
import { HomePage } from "./pages/Home.page.tsx";
import { NotFoundPage } from "./pages/NotFound.page.tsx";

export const app = defineApp({
    id: "site",
    navigation: "enhanced-mpa",
    pages: [HomePage],
    notFound: NotFoundPage,
});
```

```tsx title="main.tsx"
import { startApp } from "mainz";
import { app } from "./app.ts";

startApp(app, {
    mount: "#app",
});
```

This keeps the app definition readable and reusable without tying static tooling to bootstrap code
in `main.tsx`.

For routed apps, `navigation` is the app-owned navigation intent. Build profiles and the CLI do no override it. When an app omits `navigation`, Mainz falls back to `spa`.

For routed apps, `startApp(...)` expects a definition created by `defineApp(...)`. App definitions must provide a unique `id`. Mainz uses that `id` for app-aware diagnostics selection and reporting, including commands such as `mainz diagnose --target <name> --app <id>`.

### Locale routing and document language

Use `i18n` when the app has locale-aware routing:

```tsx title="app.ts"
export const app = defineApp({
    id: "site",
    i18n: {
        locales: ["en", "pt-BR"],
        defaultLocale: "en",
        localePrefix: "always",
    },
    pages: [HomePage],
});
```

Use `documentLanguage` when the app is monolingual and Mainz should set `<html lang>` without
turning on locale routing:

```tsx title="app.ts"
export const app = defineApp({
    id: "docs",
    documentLanguage: "pt-BR",
    pages: [HomePage],
});
```

The rules are:

- `i18n` present: routes are localized and `<html lang>` follows the resolved route locale
- no `i18n`, `documentLanguage` present: routes stay unlocalized and `<html lang>` uses that value
- neither present: Mainz does not invent a document language

## Root-only apps

Root-only apps can also use `defineApp(...)` when they need a formal composition root:

```tsx title="app.ts"
import { Component, defineApp } from "mainz";
import { singleton } from "mainz/di";

class ApiClient {
}

class AppRoot extends Component {
    override render() {
        return <main>Hello Mainz</main>;
    }
}

export const app = defineApp({
    id: "marketing-root",
    root: AppRoot,
    services: [singleton(ApiClient)],
});
```

```tsx title="main.tsx"
import { startApp } from "mainz";
import { app } from "./app.ts";

startApp(app, {
    mount: "#app",
});
```

For the simplest root-only case, the shorthand still works:

```tsx title="main.tsx"
startApp(AppRoot, {
    mount: "#app",
});
```

Use that shorthand only when the app has no routing and does not need a shared app definition for DI
or static tooling.

## Why `defineApp(...)` and `startApp(...)` are separate

They represent different responsibilities.

`defineApp(...)` answers:

- what pages or root belong to this app?
- what default navigation intent belongs to this routed app?
- does this routed app own locale routing or a fixed document language?
- which services belong to this app composition?
- what stable app `id` should tooling use?

`startApp(...)` answers:

- where should this app mount?
- which runtime auth options should it use?
- when should this definition be started?

So the split is:

- app definition = structure
- `startApp(...)` options = execution

That is why things such as `mount` and `auth` belong to `startApp(app, options?)`, not to
`defineApp(...)`.

The routed app shape is:

- `defineApp(...)` for the definition
- `startApp(app, options?)` for runtime startup
