# DI + HTTP Example

Small first-party Mainz app that demonstrates:

- official app composition through `defineApp(...)`
- app startup service registration through `services`
- `singleton(...)` registration for `HttpClient` and higher-level services
- page service resolution with `inject(Token)`
- component service resolution with `inject(Token)`
- service-to-service resolution with `inject(Token)` inside a registered implementation class
- `AbortSignal` forwarding from `Page.load(...)` and `Component.load(...)`
- fake service replacement through an alternate app definition

## Run It

Start the dev server:

```bash
deno task dev:di-http-site
```

Build the example:

```bash
deno task build:di-http-site
```

Preview the built output:

```bash
deno task preview:di-http-site
```

## What To Try

1. Open `/`.
2. Click one of the story cards.
3. Notice that the page data comes from `Page.load(...)` through a resolved `StoriesApi`.
4. Notice that the related rail comes from `Component.load(...)` through the same service token.
5. Use the backend switcher in the header:
   - `HttpClient transport` uses the main app definition with `HttpClient` + `HttpStoriesApi`.
   - `Mock replacement` boots an alternate mock app definition with `MockStoriesApi`.

## Why This Example Exists

This example keeps DI infrastructure-scoped:

- route params still flow through `Page.load(...)`
- component props still stay semantic
- DI only handles cross-cutting infrastructure access

That means the example is intentionally built around:

- `HttpClient`
- `StoriesApi`
- `defineApp(...)`
- startup registration
- alternate app definitions without pushing infrastructure through `props`

## Key Files

- `src/main.tsx`
  - selects the active app definition
- `src/app.ts`
  - defines the main HTTP-backed app
- `src/app.mock.ts`
  - defines the alternate mock-backed app
- `src/lib/api.ts`
  - defines the `StoriesApi` token, the `HttpClient`-backed implementation, the mock replacement, and the named `HttpClient` factory
- `src/pages/Home.page.tsx`
  - page-level service resolution for featured story loading
- `src/pages/Story.page.tsx`
  - page-level service resolution for story detail loading
- `src/components/RelatedStoriesSection.tsx`
  - component-level service resolution for related story loading
- `src/lib/runtime.ts`
  - persists the active backend choice across reloads

## Notes

- The `HttpClient` path uses a framework-owned client with a demo in-memory `fetch` adapter, so the
  example is reliable without a real backend.
- The app bootstrap no longer branches inside `services`; the example keeps separate HTTP and mock
  app definitions and chooses between them at startup.
- The HTTP-backed implementation now resolves `HttpClient` through `inject(Token)`, so owner and
  service dependencies use the same official DI shape.
- The mock path proves that tests or demos can replace the higher-level service registration without
  changing the page/component contracts.
- `mainz diagnose --target di-http-site` should stay clean for the official DI registration shape.
