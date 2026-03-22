# Authorization Example

Small first-party Mainz app that demonstrates:

- page authorization with `@Authorize()`
- role-based authorization with `@Authorize({ roles: [...] })`
- policy-based authorization with `@Authorize({ policy: "..." })`
- page-only anonymous access through public routes
- component-level authorization inside a broader authenticated page
- navigation visibility derived from route authorization metadata

## Run It

Start the dev server:

```bash
deno task dev:authorize-site
```

Build the example:

```bash
deno task build:authorize-site
```

Preview the built output:

```bash
deno task preview:authorize-site
```

## What To Try

1. Open `/login`.
2. Pick one of the personas.
3. Watch the visible navigation links change.
4. Visit protected routes directly:
   - `/account`
   - `/billing`
   - `/reports`
5. Switch personas and compare which routes remain visible or become forbidden.

## Session Model

This example does not use a real backend, cookies, or JWTs.

Instead, the login page stores a small JSON record in `localStorage` under:

```txt
mainz.authorize-site.session
```

Example value:

```json
{
    "userId": "u-owner",
    "displayName": "Avery Owner",
    "orgId": "mainz",
    "roles": ["member", "owner"],
    "persona": "Organization owner"
}
```

`auth.getPrincipal` reads that record and converts it into a Mainz `Principal`.

## Personas

- `Mainz Member`
  - authenticated
  - `orgId: "mainz"`
  - roles: `member`
- `Billing Admin`
  - authenticated
  - `orgId: "mainz"`
  - roles: `member`, `billing-admin`
- `Owner`
  - authenticated
  - `orgId: "mainz"`
  - roles: `member`, `owner`
- `Outside Guest`
  - authenticated
  - `orgId: "outside-co"`
  - roles: `member`

## Route Map

- `/`
  - public home page
- `/login`
  - session picker for the example
- `/account`
  - protected with `@Authorize()`
- `/billing`
  - protected with `@Authorize({ policy: "org-member" })`
- `/reports`
  - protected with `@Authorize({ roles: ["billing-admin"] })`

## Key Files

- `src/main.tsx`
  - registers `auth.getPrincipal`, `auth.policies`, and `loginPath`
- `src/lib/session.ts`
  - session presets, `localStorage` handling, and principal resolution
- `src/lib/navigation.ts`
  - derives visible links through `filterVisibleRoutes(...)`
- `src/pages/Account.page.tsx`
  - plain authenticated page
- `src/pages/Billing.page.tsx`
  - named policy example
- `src/pages/Reports.page.tsx`
  - role-based example
- `src/components/OwnerTools.tsx`
  - component-level authorization inside a broader page

## Notes

- Anonymous access to a protected page redirects to `/login`.
- Authenticated but unauthorized access renders the default Mainz `403 Forbidden` surface.
- `mainz diagnose --target authorize-site` currently reports a warning for the protected component.
  - That warning is expected under the current SSG safety rule for `Component + @Authorize(...)`.
  - The example itself is configured as CSR + SPA.
