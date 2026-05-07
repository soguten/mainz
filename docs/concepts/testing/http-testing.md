---
title: HTTP Testing
summary: Use mainz/http/testing to fake fetch, simulate latency, and keep HttpClient-based tests deterministic.
---

## HTTP testing with `mainz/http/testing`

Mainz ships a small companion surface for tests and examples that use
`mainz/http`.

Use it when you want to:

- fake `fetch` without pulling in a full mock server
- simulate latency and cancellation with `AbortSignal`
- return JSON or text responses with less boilerplate
- model retry and failure flows in a deterministic way

This package is intentionally small. It is there to make tests and examples
cleaner, not to hide how HTTP behavior works.

## Public surface

```ts
import {
  createMockFetch,
  delayWithSignal,
  httpError,
  jsonResponse,
  networkError,
  query,
  requestJson,
  sequence,
  textResponse,
} from "mainz/http/testing";
```

The most common entrypoint is `createMockFetch(...)`.

## Build a fake `fetch`

Use `createMockFetch(...)` when a test or example needs a deterministic
transport.

```ts title="api.test.ts"
import { createMockFetch, jsonResponse } from "mainz/http/testing";

const mockFetch = createMockFetch((routes) => {
  routes.get("/stories/featured", () => {
    return jsonResponse([
      { slug: "intro", title: "Intro" },
    ]);
  });

  routes.get("/stories/:slug", ({ params }) => {
    return jsonResponse({
      slug: params.slug,
      title: `Story ${params.slug}`,
    });
  });
});
```

Route handlers receive a small request context with:

- `request`
- `url`
- `params`
- `signal`

That keeps fakes explicit while removing repetitive pathname parsing.

## Use it with `HttpClient`

Pass the fake transport into `HttpClient` at startup or in a test setup.

```ts title="main.ts"
import { defineApp, startApp } from "mainz";
import { singleton } from "mainz/di";
import { HttpClient } from "mainz/http";
import { createMockFetch, jsonResponse } from "mainz/http/testing";

const mockFetch = createMockFetch((routes) => {
  routes.get("/stories/featured", () => {
    return jsonResponse([{ slug: "intro", title: "Intro" }]);
  });
});

const app = defineApp({
  pages: [HomePage],
  services: [
    singleton(HttpClient, () =>
      new HttpClient({
        baseUrl: "https://example.test",
        fetch: mockFetch,
      })),
  ],
});

startApp(app);
```

That means apps using the Mainz HTTP client get an official way to:

- keep examples self-contained
- test transport behavior without a live backend
- preserve `AbortSignal` behavior through the same client code

## Return success and failure responses

Use the response helpers when the transport should behave like real HTTP.

```ts title="handlers.ts"
import { httpError, jsonResponse, textResponse } from "mainz/http/testing";

jsonResponse({ ok: true });
textResponse("Created", { status: 201 });
httpError(404, { message: "Not found" });
```

Use `networkError(...)` when the failure should behave like transport failure
instead of an HTTP status response.

```ts title="handlers.ts"
import { networkError } from "mainz/http/testing";

throw networkError("Connection dropped");
```

## Simulate latency and cancellation

Use `delayWithSignal(...)` when you want a fake to feel like a real request and
still abort cleanly.

```ts title="handlers.ts"
import { delayWithSignal, jsonResponse } from "mainz/http/testing";

routes.get("/stories/:slug/related", async ({ params, signal }) => {
  await delayWithSignal(undefined, signal, 1200);

  return jsonResponse([
    { slug: `${params.slug}-next`, title: "Next story" },
  ]);
});
```

This is useful for:

- visible deferred fallbacks
- cancelation tests
- retry behavior
- demo apps where async timing should stay understandable

## Sequence multiple outcomes

Use `sequence(...)` when repeated requests should return different outcomes over
time.

```ts title="retry.test.ts"
import {
  createMockFetch,
  httpError,
  jsonResponse,
  sequence,
} from "mainz/http/testing";

const mockFetch = createMockFetch((routes) => {
  routes.get(
    "/session",
    sequence(
      () => httpError(401, { message: "Expired" }),
      () => jsonResponse({ user: "alexandre" }),
    ),
  );
});
```

This is especially useful for:

- retry flows
- token refresh flows
- staged loading demos

## Read JSON bodies and query params

Use `requestJson(...)` and `query(...)` when a fake route needs to inspect the
incoming request.

```ts title="post.test.ts"
import {
  createMockFetch,
  jsonResponse,
  query,
  requestJson,
} from "mainz/http/testing";

const mockFetch = createMockFetch((routes) => {
  routes.post("/search", async ({ request, url }) => {
    const body = await requestJson<{ term: string }>(request);
    const locale = query(url).get("locale");

    return jsonResponse({
      term: body.term,
      locale,
    });
  });
});
```

## Where this fits

`mainz/http/testing` complements `mainz/http`.

Use:

- `mainz/http` for application transport
- `mainz/http/testing` for tests, demos, and deterministic fake backends

For a complete working example, see:

- [`../../../examples/di-http-site/README.md`](../../../examples/di-http-site/README.md)
