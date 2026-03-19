## Runtime tests validate framework behavior directly

Some behavior belongs above one component:

- route resolution
- locale handling
- SPA navigation
- enhanced-MPA transitions
- runtime-managed SEO links

For that layer, `mainz/testing` exposes helpers aimed at runtime tests.

## Prepare the runtime test environment

Use `prepareNavigationTest()` when testing navigation/runtime behavior.

```ts title="navigation.test.ts"
import { prepareNavigationTest, waitFor } from "mainz/testing";

Deno.test("spa route resolves docs page", async () => {
    const { startNavigation } = await prepareNavigationTest();
    // ...
});
```

`prepareNavigationTest()` does two things:

- ensures the DOM environment exists
- resets document and runtime globals to a clean state

That makes repeated runtime tests much safer.

## Example: test SPA startup

```ts title="navigation.test.ts"
import { assertEquals } from "@std/assert";
import { prepareNavigationTest, waitFor } from "mainz/testing";

Deno.test("spa route resolves the current path", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { HomePage, DocsPage } = await import("./fixtures.ts");

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/docs/intro");

    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [HomePage, DocsPage],
    });

    await waitFor(() => document.title === "Docs");

    assertEquals(window.location.pathname, "/docs/intro");
    assertEquals(document.title, "Docs");

    controller.cleanup();
});
```

## Why runtime tests are useful

They let you test framework contracts without paying the full cost of a CLI build for every case.

That is useful for:

- navigation mode behavior
- locale prefix logic
- basePath handling
- lazy page resolution
- notFound runtime behavior
- head updates driven by navigation

## Useful helpers

### `prepareNavigationTest()`

Best default for runtime tests.

### `waitFor(predicate)`

Useful when the runtime updates asynchronously and you want to wait for a stable observable result.

### `nextTick()`

Useful for single-turn settling after an event or synchronous-looking state transition.

## Good test style here

Prefer tests that assert user-visible runtime effects:

- current pathname
- mounted page
- document title
- document language
- canonical and alternate links
- transition metadata on `document.documentElement`

That keeps the tests focused on behavior, not only on internal helper functions.

## When to stop and use E2E instead

Use runtime tests when you do not need to validate the actual emitted build output.

If the contract depends on:

- generated HTML files
- emitted assets
- profile-specific build output
- preview server behavior

then move up to smoke or E2E tests.
