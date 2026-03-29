## Runtime tests verify framework behavior directly

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
import { prepareNavigationTest, waitForNavigationReady } from "mainz/testing";

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
import { prepareNavigationTest, waitForNavigationReady } from "mainz/testing";

Deno.test("spa route resolves the current path", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { HomePage, DocsPage } = await import("./fixtures.ts");

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/docs/intro");

    const ready = waitForNavigationReady({
        target: document.getElementById("app")!,
        mode: "spa",
        matchedPath: "/docs/intro",
        navigationType: "initial",
    });

    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [HomePage, DocsPage],
    });

    await ready;

    assertEquals(window.location.pathname, "/docs/intro");
    assertEquals(document.title, "Docs");

    controller.cleanup();
});
```

## Example: test one app inside a multi-app page

When a page hosts more than one Mainz app, pass the app root as `target`.

```ts title="multi-app.test.ts"
import { assertEquals } from "@std/assert";
import { prepareNavigationTest, waitForNavigationReady } from "mainz/testing";

Deno.test("left app can be synchronized independently", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { LeftHomePage, RightHomePage } = await import("./fixtures.ts");

    document.body.innerHTML = `
        <main id="left-app"></main>
        <main id="right-app"></main>
    `;

    const leftApp = document.getElementById("left-app")!;
    const rightApp = document.getElementById("right-app")!;

    const leftReady = waitForNavigationReady({
        target: leftApp,
        mode: "spa",
        matchedPath: "/",
        navigationType: "initial",
    });

    startNavigation({
        mode: "spa",
        mount: leftApp,
        pages: [LeftHomePage],
    });

    startNavigation({
        mode: "spa",
        mount: rightApp,
        pages: [RightHomePage],
    });

    await leftReady;

    assertEquals(leftApp.textContent?.includes("Left"), true);
});
```

## Example: test an explicit navigation failure

When the contract you care about is failure, prefer `waitForNavigationError(...)` over inferring
failure from missing `ready` or a generic timeout.

```ts title="navigation-error.test.ts"
import { assertEquals } from "@std/assert";
import {
    prepareNavigationTest,
    waitForNavigationError,
    waitForNavigationReady,
} from "mainz/testing";

Deno.test("broken route emits navigationerror", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { HomePage, BrokenPage } = await import("./fixtures.ts");

    document.body.innerHTML = '<main id="app"></main><a id="broken" href="/broken">Broken</a>';

    const initialReady = waitForNavigationReady({
        target: document.getElementById("app")!,
        matchedPath: "/",
        navigationType: "initial",
    });

    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [HomePage, BrokenPage],
    });

    await initialReady;

    const failed = waitForNavigationError({
        target: document.getElementById("app")!,
        path: "/broken",
        matchedPath: "/broken",
        navigationType: "push",
        phase: "route-load",
    });

    document.getElementById("broken")!.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    const error = await failed;

    assertEquals(error.phase, "route-load");
    assertEquals(error.path, "/broken");

    controller.cleanup();
});
```

## Example: test a superseded navigation with propagated abort

When a navigation is canceled on purpose, prefer `waitForNavigationAbort(...)` over inferring
cancelation from missing `ready`.

```ts title="navigation-abort.test.ts"
import { assertEquals } from "@std/assert";
import {
    prepareNavigationTest,
    waitForNavigationAbort,
    waitForNavigationReady,
} from "mainz/testing";

Deno.test("slow navigation is superseded before costly work finishes", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { HomePage, DocsPage, SlowPage, waitForSlowLoadStart } = await import("./fixtures.ts");

    document.body.innerHTML = `
        <main id="app"></main>
        <a id="slow" href="/slow">Slow</a>
        <a id="docs" href="/docs/intro">Docs</a>
    `;
    window.history.replaceState(null, "", "/");

    const appRoot = document.getElementById("app")!;
    const initialReady = waitForNavigationReady({
        target: appRoot,
        matchedPath: "/",
        navigationType: "initial",
    });

    const controller = startNavigation({
        mode: "spa",
        mount: appRoot,
        pages: [HomePage, DocsPage, SlowPage],
    });

    await initialReady;

    const aborted = waitForNavigationAbort({
        target: appRoot,
        path: "/slow",
        matchedPath: "/slow",
        navigationType: "push",
        reason: "superseded",
    });
    const docsReady = waitForNavigationReady({
        target: appRoot,
        path: "/docs/:slug",
        matchedPath: "/docs/intro",
        navigationType: "push",
    });

    document.getElementById("slow")!.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await waitForSlowLoadStart();

    document.getElementById("docs")!.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    const [abortDetail, readyDetail] = await Promise.all([aborted, docsReady]);

    assertEquals(abortDetail.reason, "superseded");
    assertEquals(abortDetail.navigationSequence < readyDetail.navigationSequence, true);

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

### `waitForNavigationStart(...)`

Use it when the test is really asking "did Mainz accept and begin this navigation?"

Good for:

- pending-state assertions
- click interception checks
- timing or tracing around navigation lifecycle

### `waitForNavigationAbort(...)`

Use it when the test is really asking "did Mainz cancel this navigation on purpose?"

Good for:

- superseded SPA navigations
- cleanup/teardown of in-flight navigations
- proving an aborted navigation was not later treated as `ready`
- tests that need to verify cancelation instead of generic timeout behavior

### `waitForNavigationError(...)`

Use it when the test is really asking "did this managed navigation fail?"

Good for:

- route load failures
- render-time failures during navigation
- tests that would otherwise infer failure from missing `ready` or generic timeout behavior

### `waitForNavigationReady(...)`

Best default when the test is really asking "has Mainz finished applying the current navigation?"

When the test knows the app root, prefer passing `target` so multi-app setups stay unambiguous.

If the page only hosts one Mainz app, omitting `target` is still ergonomic because the event bubbles
and can be observed from `document`.

Use it for:

- initial SPA startup
- client-side push and pop navigation
- document-first bootstrap in `mpa` and `enhanced-mpa`
- runtime tests that previously guessed readiness from title, locale, or body text

### `waitFor(predicate)`

Useful after readiness when you still need to poll for a narrower post-condition.

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

Prefer this sequencing:

- wait for `waitForNavigationStart(...)` when testing pending state
- wait for `waitForNavigationAbort(...)` when testing cancelation and supersedence
- wait for `waitForNavigationError(...)` when testing failure paths
- wait for `waitForNavigationReady(...)`
- then assert title, locale, body, and head behavior

That keeps synchronization separate from behavior assertions.

## When to stop and use E2E instead

Use runtime tests when you do not need to validate the actual emitted build output.

If the contract depends on:

- generated HTML files
- emitted assets
- profile-specific build output
- preview server behavior

then move up to smoke or E2E tests.

