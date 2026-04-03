---
title: Authorization
slug: authorization
summary: Keep access rules on the page or component that owns them, then let runtime, navigation, and diagnostics consume the same metadata.
order: 9
---

## Authorization stays on the owner

Mainz keeps authorization in the same place as the rest of the route and component contract.

- protect a route with `@Authorize(...)` on the page
- add stricter local requirements with `@Authorize(...)` on a component
- opt a page out with `@AllowAnonymous()`

That keeps access rules visible to discovery, navigation, runtime enforcement, and diagnostics
without introducing a separate guard file or router middleware layer.

The repository also includes a small end-to-end example in `examples/authorize-site`.

## Protect a page

Use `@Authorize()` when the route requires an authenticated principal, even if you do not need
roles or a named policy yet.

```tsx title="Account.page.tsx"
import { Authorize, Page, RenderMode, Route } from "mainz";

@Route("/account")
@RenderMode("csr")
@Authorize()
export class AccountPage extends Page {
    static override async load({ principal }) {
        return {
            userId: principal?.id,
        };
    }

    override render() {
        return <section>Private account area</section>;
    }
}
```

`Page.load()` now receives `principal`, so route-owned loading can use the resolved identity without
re-reading session state.

## Add roles or a named policy

Roles and named policies are additive on top of authentication.

```tsx title="Billing.page.tsx"
import { Authorize, Page, RenderMode, Route } from "mainz";

@Route("/billing")
@RenderMode("csr")
@Authorize({ roles: ["billing-admin"], policy: "org-member" })
export class BillingPage extends Page {}
```

That page now requires:

- an authenticated principal
- at least one matching role from `roles`
- a truthy result from the named `policy`

## Register principal resolution and policies at startup

Runtime authorization lives in the app bootstrap through the `auth` option on
`startApp(app, ...)` or `startNavigation(...)`.

```tsx title="main.tsx"
import {
    createAnonymousPrincipal,
    defineApp,
    startApp,
} from "mainz";
import { AccountPage } from "./pages/Account.page.tsx";
import { BillingPage } from "./pages/Billing.page.tsx";
import { LoginPage } from "./pages/Login.page.tsx";

const app = defineApp({
    pages: [AccountPage, BillingPage, LoginPage],
});

startApp(app, {
    auth: {
        loginPath: "/login",
        async getPrincipal() {
            const session = await readSession();

            if (!session) {
                return createAnonymousPrincipal();
            }

            return {
                authenticated: true,
                id: session.userId,
                roles: session.roles,
                claims: {
                    orgId: session.orgId,
                },
            };
        },
        policies: {
            "org-member": (principal) => principal.claims.orgId === "mainz",
        },
    },
});
```

At runtime:

- anonymous access to a protected page redirects to the login path
- authenticated but unauthorized access renders a default `403 Forbidden` surface
- missing named policies fail fast instead of silently denying access

## Components can add stricter local requirements

Use component authorization when one part of an otherwise allowed route still needs stricter access.

```tsx title="DangerZone.tsx"
import { Authorize, Component, type NoProps, type NoState } from "mainz";

@Authorize({ roles: ["owner"] })
export class DangerZone extends Component<NoProps, NoState> {
    override render() {
        return <button>Delete organization</button>;
    }
}
```

Component authorization is additive relative to the page. Unauthorized component content does not
render, and protected `Component.load()` work is skipped for unauthorized principals.

`@AllowAnonymous()` is page-only. Mainz reports it as an error if you apply it to a component.

## Let navigation reuse the same metadata

Route manifests now carry authorization metadata, so navigation UIs can derive visibility from the
same source of truth as runtime enforcement.

```ts title="navigation.ts"
import { filterVisibleRoutes } from "mainz";

const visibleRoutes = await filterVisibleRoutes({
    routes: manifest.routes,
    principal,
    policies: auth.policies,
});
```

For one-off checks, use `isRouteVisible(...)`. For startup diagnostics or custom tooling, use
`findMissingAuthorizationPolicies(...)`.

## `mainz diagnose` also needs policy names

The CLI can read `@Authorize({ policy: "..." })` statically, but runtime policy implementations are
registered later during app startup.

Declare policy names in `mainz.config.ts` so diagnostics can validate them without executing the
app:

```ts title="mainz.config.ts"
export default {
    targets: [
        {
            name: "site",
            rootDir: "./site",
            viteConfig: "./vite.config.ts",
            authorization: {
                policyNames: ["org-member", "billing-admin"],
            },
        },
    ],
};
```

That declaration is for diagnostics and tooling only. The actual policy functions still belong in
`auth.policies` at runtime. See [diagnostics CLI](./diagnostics-cli.md) for the terminal workflow.

## SSG must keep private state out of shared HTML

Protected content and shared prerendered HTML do not mix cleanly.

- `Page + @Authorize(...) + @RenderMode("ssg")` produces a diagnostics warning
- `Component + @Authorize(...)` is incompatible with shared SSG output and fails fast during SSG

When the route shell is public but a personalized area is not, prefer the
[Public Shell, Private Island](./public-shell-private-island.md) pattern instead of prerendering
protected content.


