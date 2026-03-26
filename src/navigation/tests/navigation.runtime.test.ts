/// <reference lib="deno.ns" />

import { assert, assertEquals, assertThrows } from "@std/assert";
import {
    nextTick,
    prepareNavigationTest,
    waitFor,
    waitForNavigationAbort,
    waitForNavigationError,
    waitForNavigationReady,
    waitForNavigationStart,
} from "../../testing/index.ts";
import type { SpaNavigationRenderContext } from "../index.ts";

let spaFixturesPromise: Promise<typeof import("./navigation.spa.fixture.ts")> | undefined;
let snapshotFixturePromise: Promise<typeof import("./navigation.snapshot.fixture.ts")> | undefined;

async function loadSpaFixtures(): Promise<typeof import("./navigation.spa.fixture.ts")> {
    if (!spaFixturesPromise) {
        spaFixturesPromise = import("./navigation.spa.fixture.ts");
    }

    return await spaFixturesPromise;
}

async function loadSnapshotFixture(): Promise<typeof import("./navigation.snapshot.fixture.ts")> {
    if (!snapshotFixturePromise) {
        snapshotFixturePromise = import("./navigation.snapshot.fixture.ts");
    }

    return await snapshotFixturePromise;
}

Deno.test("navigation/runtime: should mark document with the resolved navigation mode", async () => {
    const { startNavigation } = await prepareNavigationTest();

    const controller = startNavigation({ mode: "mpa" });

    assertEquals(document.documentElement.dataset.mainzNavigation, "mpa");
    assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);
    assertEquals(document.documentElement.dataset.mainzViewTransitions, undefined);

    controller.cleanup();
});

Deno.test("navigation/runtime: should render the current SPA route on startup", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage, SpaDocsPage } = await loadSpaFixtures();
    const seenContexts: SpaNavigationRenderContext[] = [];

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/docs/intro");

    const ready = waitForNavigationReady({
        mode: "spa",
        path: "/docs/:slug",
        matchedPath: "/docs/intro",
        navigationType: "initial",
    });
    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [SpaHomePage, SpaDocsPage],
        onRoute(context) {
            seenContexts.push(context);
        },
    });
    const readyDetail = await ready;

    const mountedPage = document.querySelector("#app x-mainz-navigation-spa-docs-page");
    const mountedContent = document.querySelector(
        '#app x-mainz-navigation-spa-docs-page [data-page="docs"]',
    );
    assert(mountedPage);
    assert(mountedContent);
    assertEquals(document.title, "Docs");
    assertEquals(mountedPage.textContent, "Docs page:intro");
    assertEquals(mountedContent.getAttribute("data-slug"), "intro");
    assertEquals(readyDetail.mode, "spa");
    assertEquals(readyDetail.navigationSequence, 1);
    assertEquals(seenContexts[0]?.path, "/docs/:slug");
    assertEquals(seenContexts[0]?.matchedPath, "/docs/intro");
    assertEquals(seenContexts[0]?.params.slug, "intro");

    controller.cleanup();
});

Deno.test("navigation/runtime: should emit navigation-start before navigation-ready with the same sequence", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage, SpaDocsPage } = await loadSpaFixtures();

    document.body.innerHTML = '<main id="app"></main><a id="docs-link" href="/docs/intro">Docs</a>';

    const initialReady = waitForNavigationReady({
        mode: "spa",
        matchedPath: "/",
        navigationSequence: 1,
    });
    const controller = startNavigation({
        mode: "spa",
        spa: {
            mount: "#app",
            pages: [SpaHomePage, SpaDocsPage],
        },
    });
    await initialReady;

    const started = waitForNavigationStart({
        target: document.getElementById("app")!,
        mode: "spa",
        path: "/docs/:slug",
        matchedPath: "/docs/intro",
        navigationType: "push",
    });
    const ready = waitForNavigationReady({
        target: document.getElementById("app")!,
        mode: "spa",
        path: "/docs/:slug",
        matchedPath: "/docs/intro",
        navigationType: "push",
    });

    document.getElementById("docs-link")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    const [startDetail, readyDetail] = await Promise.all([started, ready]);

    assertEquals(startDetail.navigationSequence, readyDetail.navigationSequence);
    assertEquals(startDetail.navigationSequence, 2);
    assertEquals(window.location.pathname, "/docs/intro");

    controller.cleanup();
});

Deno.test("navigation/runtime: should emit navigation-ready for repeated SPA navigations with increasing sequence values", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage, SpaDocsPage } = await loadSpaFixtures();

    document.body.innerHTML = '<main id="app"></main><a id="docs-link" href="/docs/intro">Docs</a>';

    const initialReady = waitForNavigationReady({
        mode: "spa",
        matchedPath: "/",
        navigationSequence: 1,
    });
    const controller = startNavigation({
        mode: "spa",
        spa: {
            mount: "#app",
            pages: [SpaHomePage, SpaDocsPage],
        },
    });
    await initialReady;

    const docsReady = waitForNavigationReady({
        mode: "spa",
        matchedPath: "/docs/intro",
        navigationType: "push",
        navigationSequence: 2,
    });
    document.getElementById("docs-link")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    const docsDetail = await docsReady;

    assertEquals(window.location.pathname, "/docs/intro");
    assertEquals(docsDetail.path, "/docs/:slug");
    assertEquals(docsDetail.navigationSequence, 2);

    controller.cleanup();
});

Deno.test("navigation/runtime: should emit navigation-ready from the app mount and bubble to document", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage } = await loadSpaFixtures();

    document.body.innerHTML = '<main id="app"></main>';

    const appMount = document.getElementById("app");
    assert(appMount instanceof HTMLElement);

    let seenTarget: EventTarget | null = null;
    document.addEventListener(
        "mainz:navigationready",
        (event) => {
            seenTarget = event.target;
        },
        { once: true },
    );

    const ready = waitForNavigationReady({
        target: appMount,
        mode: "spa",
        matchedPath: "/",
        navigationType: "initial",
    });

    const controller = startNavigation({
        mode: "spa",
        mount: appMount,
        pages: [SpaHomePage],
    });

    await ready;

    assertEquals(seenTarget, appMount);

    controller.cleanup();
});

Deno.test("navigation/runtime: should render the SPA notFound page for unknown startup routes", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage, SpaDocsPage, SpaNotFoundPage } = await loadSpaFixtures();

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/missing");

    const controller = startNavigation({
        mode: "spa",
        spa: {
            mount: "#app",
            pages: [SpaHomePage, SpaDocsPage],
            notFound: SpaNotFoundPage,
        },
    });
    await waitForNavigationReady({
        mode: "spa",
        navigationType: "initial",
        message: "Expected the SPA notFound startup route to emit navigation ready.",
    });

    assert(document.querySelector("#app x-mainz-navigation-spa-not-found-page"));
    assertEquals(document.title, "Not Found");

    controller.cleanup();
});

Deno.test("navigation/runtime: should redirect anonymous protected routes to the login page", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaLoginPage, SpaProtectedPage, resetProtectedLoadCount, readProtectedLoadCount } =
        await loadSpaFixtures();
    resetProtectedLoadCount();

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/dashboard");

    const ready = waitForNavigationReady({
        mode: "spa",
        path: "/login",
        matchedPath: "/login",
        navigationType: "initial",
    });
    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [SpaLoginPage, SpaProtectedPage],
    });

    const readyDetail = await ready;

    assertEquals(window.location.pathname, "/login");
    assertEquals(readyDetail.path, "/login");
    assertEquals(
        document.querySelector("#app x-mainz-navigation-spa-login-page")?.textContent,
        "Login page",
    );
    assertEquals(readProtectedLoadCount(), 0);

    controller.cleanup();
});

Deno.test("navigation/runtime: should keep one lifecycle sequence across redirect-to-login and final ready", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaLoginPage, SpaProtectedPage } = await loadSpaFixtures();

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/dashboard");

    const started = waitForNavigationStart({
        target: document.getElementById("app")!,
        mode: "spa",
        path: "/dashboard",
        matchedPath: "/dashboard",
        navigationType: "initial",
    });
    const ready = waitForNavigationReady({
        target: document.getElementById("app")!,
        mode: "spa",
        path: "/login",
        matchedPath: "/login",
        navigationType: "initial",
    });
    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [SpaLoginPage, SpaProtectedPage],
    });

    const [startDetail, readyDetail] = await Promise.all([started, ready]);

    assertEquals(startDetail.navigationSequence, readyDetail.navigationSequence);
    assertEquals(startDetail.path, "/dashboard");
    assertEquals(readyDetail.path, "/login");
    assertEquals(window.location.pathname, "/login");

    controller.cleanup();
});

Deno.test("navigation/runtime: should resolve principal before protected page load and expose it in route context", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaLoginPage, SpaProtectedPage, resetProtectedLoadCount, readProtectedLoadCount } =
        await loadSpaFixtures();
    const seenContexts: SpaNavigationRenderContext[] = [];
    resetProtectedLoadCount();

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/dashboard");

    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [SpaLoginPage, SpaProtectedPage],
        auth: {
            async getPrincipal() {
                return {
                    authenticated: true,
                    id: "user-123",
                    roles: ["member"],
                    claims: {},
                };
            },
        },
        onRoute(context) {
            seenContexts.push(context);
        },
    });

    await waitForNavigationReady({
        mode: "spa",
        navigationType: "initial",
        message: "Expected the protected startup route to emit navigation ready.",
    });

    assertEquals(
        document.querySelector("#app x-mainz-navigation-spa-protected-page")?.textContent,
        "Dashboard page:user-123",
    );
    assertEquals(
        document.querySelector('#app [data-page="dashboard"]')?.getAttribute("data-user-id"),
        "user-123",
    );
    assertEquals(readProtectedLoadCount(), 1);
    assertEquals(seenContexts[0]?.principal.id, "user-123");
    assertEquals(seenContexts[0]?.authorization?.requirement?.authenticated, true);

    controller.cleanup();
});

Deno.test("navigation/runtime: should surface a forbidden page when an authenticated principal lacks route access", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaAdminPage, SpaLoginPage } = await loadSpaFixtures();
    const seenContexts: SpaNavigationRenderContext[] = [];

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/admin");

    const ready = waitForNavigationReady({
        mode: "spa",
        path: "/admin",
        matchedPath: "/admin",
        navigationType: "initial",
    });
    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [SpaLoginPage, SpaAdminPage],
        auth: {
            async getPrincipal() {
                return {
                    authenticated: true,
                    id: "member-1",
                    roles: ["member"],
                    claims: {},
                };
            },
        },
        onRoute(context) {
            seenContexts.push(context);
        },
    });

    const readyDetail = await ready;

    assertEquals(window.location.pathname, "/admin");
    assertEquals(readyDetail.path, "/admin");
    assertEquals(
        document.querySelector('#app [data-mainz-authorization="forbidden"]')?.textContent,
        "403 Forbidden",
    );
    assertEquals(document.querySelector("#app x-mainz-navigation-spa-admin-page"), null);
    assertEquals(seenContexts.length, 0);

    controller.cleanup();
});

Deno.test("navigation/runtime: should treat forbidden output as start-to-ready for one sequence", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaAdminPage, SpaLoginPage } = await loadSpaFixtures();

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/admin");

    const started = waitForNavigationStart({
        target: document.getElementById("app")!,
        mode: "spa",
        path: "/admin",
        matchedPath: "/admin",
        navigationType: "initial",
    });
    const ready = waitForNavigationReady({
        target: document.getElementById("app")!,
        mode: "spa",
        path: "/admin",
        matchedPath: "/admin",
        navigationType: "initial",
    });
    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [SpaLoginPage, SpaAdminPage],
        auth: {
            async getPrincipal() {
                return {
                    authenticated: true,
                    id: "member-1",
                    roles: ["member"],
                    claims: {},
                };
            },
        },
    });

    const [startDetail, readyDetail] = await Promise.all([started, ready]);

    assertEquals(startDetail.navigationSequence, readyDetail.navigationSequence);
    assertEquals(
        document.querySelector('#app [data-mainz-authorization="forbidden"]')?.textContent,
        "403 Forbidden",
    );

    controller.cleanup();
});

Deno.test("navigation/runtime: should emit navigation-error when managed route loading fails", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaBrokenPage, SpaHomePage } = await loadSpaFixtures();

    document.body.innerHTML = '<main id="app"></main><a id="broken-link" href="/broken">Broken</a>';

    const initialReady = waitForNavigationReady({
        mode: "spa",
        matchedPath: "/",
        navigationSequence: 1,
    });
    const controller = startNavigation({
        mode: "spa",
        spa: {
            mount: "#app",
            pages: [SpaHomePage, SpaBrokenPage],
        },
    });
    await initialReady;

    const started = waitForNavigationStart({
        target: document.getElementById("app")!,
        path: "/broken",
        matchedPath: "/broken",
        navigationType: "push",
    });
    const failed = waitForNavigationError({
        target: document.getElementById("app")!,
        path: "/broken",
        matchedPath: "/broken",
        navigationType: "push",
        phase: "route-load",
    });

    document.getElementById("broken-link")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    const [startDetail, errorDetail] = await Promise.all([started, failed]);

    assertEquals(errorDetail.navigationSequence, startDetail.navigationSequence);
    assertEquals(errorDetail.message, "Broken route load.");
    assertEquals(window.location.pathname, "/");
    assertEquals(document.querySelector("#app x-mainz-navigation-spa-home-page") !== null, true);

    controller.cleanup();
});

Deno.test("navigation/runtime: should abort a superseded navigation, propagate the signal, and avoid stale ready", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const {
        SpaHomePage,
        SpaDocsPage,
        SpaSlowPage,
        readAbortAwareAbortObservedCount,
        readAbortAwareExpensiveCallCount,
        readAbortAwareLoadStartedCount,
        resetAbortAwareLoadStats,
        waitForAbortAwareLoadStart,
    } = await loadSpaFixtures();

    resetAbortAwareLoadStats();

    document.body.innerHTML =
        '<main id="app"></main><a id="slow-link" href="/slow">Slow</a><a id="docs-link" href="/docs/intro">Docs</a>';
    window.history.replaceState(null, "", "/");

    const initialReady = waitForNavigationReady({
        mode: "spa",
        matchedPath: "/",
        navigationSequence: 1,
    });
    const controller = startNavigation({
        mode: "spa",
        spa: {
            mount: "#app",
            pages: [SpaHomePage, SpaDocsPage, SpaSlowPage],
        },
    });
    await initialReady;

    const aborted = waitForNavigationAbort({
        target: document.getElementById("app")!,
        path: "/slow",
        matchedPath: "/slow",
        navigationType: "push",
        reason: "superseded",
    });
    const docsReady = waitForNavigationReady({
        target: document.getElementById("app")!,
        path: "/docs/:slug",
        matchedPath: "/docs/intro",
        navigationType: "push",
    });

    document.getElementById("slow-link")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await waitForAbortAwareLoadStart();

    document.getElementById("docs-link")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    const [abortDetail, readyDetail] = await Promise.all([aborted, docsReady]);
    await new Promise((resolve) => setTimeout(resolve, 70));

    assertEquals(readAbortAwareLoadStartedCount(), 1);
    assertEquals(readAbortAwareExpensiveCallCount(), 0);
    assertEquals(readAbortAwareAbortObservedCount(), 1);
    assertEquals(abortDetail.reason, "superseded");
    assertEquals(abortDetail.navigationSequence < readyDetail.navigationSequence, true);
    assertEquals(window.location.pathname, "/docs/intro");
    assertEquals(document.title, "Docs");
    assertEquals(document.querySelector('#app [data-page="slow"]'), null);

    controller.cleanup();
});

Deno.test("navigation/runtime: should emit navigation-abort on cleanup for an in-flight navigation without later ready or error", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const {
        SpaSlowPage,
        readAbortAwareAbortObservedCount,
        readAbortAwareExpensiveCallCount,
        readAbortAwareLoadStartedCount,
        resetAbortAwareLoadStats,
        waitForAbortAwareLoadStart,
    } = await loadSpaFixtures();

    resetAbortAwareLoadStats();

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/slow");

    const appRoot = document.getElementById("app");
    assert(appRoot instanceof HTMLElement);

    let readyCount = 0;
    let errorCount = 0;
    appRoot.addEventListener("mainz:navigationready", () => {
        readyCount += 1;
    });
    appRoot.addEventListener("mainz:navigationerror", () => {
        errorCount += 1;
    });

    const started = waitForNavigationStart({
        target: appRoot,
        path: "/slow",
        matchedPath: "/slow",
        navigationType: "initial",
    });
    const aborted = waitForNavigationAbort({
        target: appRoot,
        path: "/slow",
        matchedPath: "/slow",
        navigationType: "initial",
        reason: "cleanup",
    });

    const controller = startNavigation({
        mode: "spa",
        mount: appRoot,
        pages: [SpaSlowPage],
    });

    const startDetail = await started;
    await waitForAbortAwareLoadStart();
    controller.cleanup();

    const abortDetail = await aborted;
    await new Promise((resolve) => setTimeout(resolve, 70));

    assertEquals(abortDetail.navigationSequence, startDetail.navigationSequence);
    assertEquals(abortDetail.reason, "cleanup");
    assertEquals(readAbortAwareLoadStartedCount(), 1);
    assertEquals(readAbortAwareExpensiveCallCount(), 0);
    assertEquals(readAbortAwareAbortObservedCount(), 1);
    assertEquals(readyCount, 0);
    assertEquals(errorCount, 0);
    assertEquals(document.querySelector('#app [data-page="slow"]'), null);
});

Deno.test("navigation/runtime: should normalize authorization failures as navigation-error phase authorization", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaProtectedPage } = await loadSpaFixtures();

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/dashboard");

    const appRoot = document.getElementById("app");
    assert(appRoot instanceof HTMLElement);

    const started = waitForNavigationStart({
        target: appRoot,
        path: "/dashboard",
        matchedPath: "/dashboard",
        navigationType: "initial",
    });
    const failed = waitForNavigationError({
        target: appRoot,
        path: "/dashboard",
        matchedPath: "/dashboard",
        navigationType: "initial",
        phase: "authorization",
    });

    const controller = startNavigation({
        mode: "spa",
        mount: appRoot,
        pages: [SpaProtectedPage],
        auth: {
            async getPrincipal() {
                throw new Error("Principal lookup failed.");
            },
        },
    });

    const [startDetail, errorDetail] = await Promise.all([started, failed]);

    assertEquals(errorDetail.navigationSequence, startDetail.navigationSequence);
    assertEquals(errorDetail.phase, "authorization");
    assertEquals(errorDetail.message, "Principal lookup failed.");

    controller.cleanup();
});

Deno.test("navigation/runtime: should emit exactly one terminal event for a failed navigation sequence", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaBrokenPage, SpaHomePage } = await loadSpaFixtures();

    document.body.innerHTML = '<main id="app"></main><a id="broken-link" href="/broken">Broken</a>';

    const initialReady = waitForNavigationReady({
        mode: "spa",
        matchedPath: "/",
        navigationSequence: 1,
    });
    const appRoot = document.getElementById("app");
    assert(appRoot instanceof HTMLElement);

    const terminalEvents: string[] = [];
    appRoot.addEventListener("mainz:navigationready", () => terminalEvents.push("ready"));
    appRoot.addEventListener("mainz:navigationerror", () => terminalEvents.push("error"));
    appRoot.addEventListener("mainz:navigationabort", () => terminalEvents.push("abort"));

    const controller = startNavigation({
        mode: "spa",
        spa: {
            mount: appRoot,
            pages: [SpaHomePage, SpaBrokenPage],
        },
    });
    await initialReady;
    terminalEvents.length = 0;

    const failed = waitForNavigationError({
        target: appRoot,
        path: "/broken",
        matchedPath: "/broken",
        navigationType: "push",
        phase: "route-load",
    });

    document.getElementById("broken-link")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    const errorDetail = await failed;
    controller.cleanup();
    await nextTick();

    assertEquals(errorDetail.navigationSequence, 2);
    assertEquals(terminalEvents, ["error"]);
});

Deno.test("navigation/runtime: should keep navigation-error isolated to the app root that failed", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaBrokenPage, SpaHomePage } = await loadSpaFixtures();

    document.body.innerHTML = `
        <main id="left-app"></main>
        <main id="right-app"></main>
        <a id="broken-link" href="/broken">Broken</a>
    `;
    window.history.replaceState(null, "", "/");

    const leftApp = document.getElementById("left-app");
    const rightApp = document.getElementById("right-app");
    assert(leftApp instanceof HTMLElement);
    assert(rightApp instanceof HTMLElement);

    let rightErrorCount = 0;
    rightApp.addEventListener("mainz:navigationerror", () => {
        rightErrorCount += 1;
    });

    const leftReady = waitForNavigationReady({
        target: leftApp,
        path: "/",
        matchedPath: "/",
        navigationType: "initial",
    });
    const rightReady = waitForNavigationReady({
        target: rightApp,
        path: "/",
        matchedPath: "/",
        navigationType: "initial",
    });

    const leftController = startNavigation({
        mode: "spa",
        mount: leftApp,
        pages: [SpaHomePage, SpaBrokenPage],
    });
    const rightController = startNavigation({
        mode: "spa",
        mount: rightApp,
        pages: [SpaHomePage],
    });

    await Promise.all([leftReady, rightReady]);

    const failed = waitForNavigationError({
        target: leftApp,
        path: "/broken",
        matchedPath: "/broken",
        navigationType: "push",
        phase: "route-load",
    });

    document.getElementById("broken-link")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    const errorDetail = await failed;
    await nextTick();

    assertEquals(errorDetail.path, "/broken");
    assertEquals(rightErrorCount, 0);
    assertEquals(rightApp.querySelector('[data-page="home"]') !== null, true);

    leftController.cleanup();
    rightController.cleanup();
});

Deno.test("navigation/runtime: should keep navigation-abort isolated to the app root that was superseded", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const {
        SpaDocsPage,
        SpaHomePage,
        SpaSlowPage,
        resetAbortAwareLoadStats,
        waitForAbortAwareLoadStart,
    } = await loadSpaFixtures();

    resetAbortAwareLoadStats();

    document.body.innerHTML = `
        <main id="left-app"></main>
        <main id="right-app"></main>
        <a id="slow-link" href="/slow">Slow</a>
        <a id="docs-link" href="/docs/intro">Docs</a>
    `;
    window.history.replaceState(null, "", "/");

    const leftApp = document.getElementById("left-app");
    const rightApp = document.getElementById("right-app");
    assert(leftApp instanceof HTMLElement);
    assert(rightApp instanceof HTMLElement);

    let rightAbortCount = 0;
    rightApp.addEventListener("mainz:navigationabort", () => {
        rightAbortCount += 1;
    });

    const leftReady = waitForNavigationReady({
        target: leftApp,
        path: "/",
        matchedPath: "/",
        navigationType: "initial",
    });
    const rightReady = waitForNavigationReady({
        target: rightApp,
        path: "/",
        matchedPath: "/",
        navigationType: "initial",
    });

    const leftController = startNavigation({
        mode: "spa",
        mount: leftApp,
        pages: [SpaHomePage, SpaDocsPage, SpaSlowPage],
    });
    const rightController = startNavigation({
        mode: "spa",
        mount: rightApp,
        pages: [SpaHomePage],
    });

    await Promise.all([leftReady, rightReady]);

    const aborted = waitForNavigationAbort({
        target: leftApp,
        path: "/slow",
        matchedPath: "/slow",
        navigationType: "push",
        reason: "superseded",
    });
    const docsReady = waitForNavigationReady({
        target: leftApp,
        path: "/docs/:slug",
        matchedPath: "/docs/intro",
        navigationType: "push",
    });

    document.getElementById("slow-link")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await waitForAbortAwareLoadStart();

    document.getElementById("docs-link")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    const [abortDetail, readyDetail] = await Promise.all([aborted, docsReady]);
    await new Promise((resolve) => setTimeout(resolve, 70));

    assertEquals(abortDetail.navigationSequence < readyDetail.navigationSequence, true);
    assertEquals(rightAbortCount, 0);
    assertEquals(rightApp.querySelector('[data-page="home"]') !== null, true);

    leftController.cleanup();
    rightController.cleanup();
});

Deno.test("navigation/runtime: should fail fast when configured pages reference missing authorization policies", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaLoginPage, SpaPolicyPage } = await loadSpaFixtures();

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/org");

    assertThrows(
        () =>
            startNavigation({
                mode: "spa",
                mount: "#app",
                pages: [SpaLoginPage, SpaPolicyPage],
            }),
        Error,
        'Configured pages reference unregistered authorization policies: "org-member".',
    );
});

Deno.test("navigation/runtime: startPagesApp should use runtime defaults and inferred locales", async () => {
    const { startPagesApp } = await prepareNavigationTest();
    const { SpaHomePage, SpaNotFoundPage } = await loadSpaFixtures();

    (globalThis as Record<string, unknown>).__MAINZ_NAVIGATION_MODE__ = "mpa";
    (globalThis as Record<string, unknown>).__MAINZ_BASE_PATH__ = "/docs/";
    (globalThis as Record<string, unknown>).__MAINZ_TARGET_LOCALES__ = ["en", "pt"];

    document.body.innerHTML =
        `<main id="app"><${SpaHomePage.getTagName()}></${SpaHomePage.getTagName()}></main>`;
    window.history.replaceState(null, "", "/docs/pt/");

    const controller = startPagesApp({
        pages: [SpaHomePage],
        notFound: SpaNotFoundPage,
    });

    await waitForNavigationReady({
        mode: "mpa",
        locale: "pt",
        navigationType: "initial",
        message: "Expected the prerendered home page to emit navigation ready for pt.",
    });

    assertEquals(document.documentElement.dataset.mainzNavigation, "mpa");
    assertEquals(document.documentElement.lang, "pt");
    assertEquals(
        document.querySelector(`#app ${SpaHomePage.getTagName()}`)?.textContent,
        "Home page",
    );

    controller.cleanup();
});

Deno.test("navigation/runtime: should strip locale prefixes and notify locale changes", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage, SpaDocsPage } = await loadSpaFixtures();
    const seenLocales: string[] = [];

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/pt/docs/intro");

    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [SpaHomePage, SpaDocsPage],
        locales: ["en", "pt"],
        onLocaleChange({ locale }) {
            seenLocales.push(locale);
        },
    });

    await waitForNavigationReady({
        mode: "spa",
        locale: "pt",
        navigationType: "initial",
        message: "Expected the localized docs startup route to emit navigation ready.",
    });

    assertEquals(document.documentElement.lang, "pt");
    assertEquals(seenLocales, ["pt"]);
    assertEquals(
        document.querySelector("#app x-mainz-navigation-spa-docs-page")?.textContent,
        "Docs page:intro",
    );

    controller.cleanup();
});

Deno.test("navigation/runtime: should redirect the spa root to the preferred locale on startup", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage } = await loadSpaFixtures();

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/");
    overrideNavigatorLocale("pt-BR");

    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [SpaHomePage],
        locales: ["en", "pt"],
    });

    await waitForNavigationReady({
        mode: "spa",
        locale: "pt",
        navigationType: "initial",
        message: "Expected the root locale redirect to finish navigation for pt.",
    });

    assertEquals(window.location.pathname, "/pt/");
    assertEquals(document.documentElement.lang, "pt");

    controller.cleanup();
});

Deno.test("navigation/runtime: should fallback the spa root redirect to the primary locale when navigator locale is unsupported", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage } = await loadSpaFixtures();

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/");
    overrideNavigatorLocale("es-ES");

    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [SpaHomePage],
        locales: ["en", "pt"],
    });

    await waitForNavigationReady({
        mode: "spa",
        locale: "en",
        navigationType: "initial",
        message: "Expected the root locale fallback redirect to finish navigation for en.",
    });

    assertEquals(window.location.pathname, "/en/");
    assertEquals(document.documentElement.lang, "en");

    controller.cleanup();
});

Deno.test("navigation/runtime: should not prefix the spa root for single-locale auto targets", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage } = await loadSpaFixtures();

    (globalThis as Record<string, unknown>).__MAINZ_LOCALE_PREFIX__ = "auto";

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/");
    overrideNavigatorLocale("en-US");

    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [SpaHomePage],
        locales: ["en"],
    });

    await waitForNavigationReady({
        mode: "spa",
        locale: "en",
        navigationType: "initial",
        message: "Expected the single-locale root route to emit navigation ready.",
    });

    assertEquals(window.location.pathname, "/");
    assertEquals(document.documentElement.lang, "en");

    controller.cleanup();
});

Deno.test("navigation/runtime: should apply generated canonical and hreflang links for spa routes", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage, SpaDocsPage } = await loadSpaFixtures();

    (globalThis as Record<string, unknown>).__MAINZ_DEFAULT_LOCALE__ = "en";
    (globalThis as Record<string, unknown>).__MAINZ_SITE_URL__ = "https://mainz.dev";

    document.body.innerHTML = '<main id="app"></main><a id="go-home" href="/en/">Home</a>';
    window.history.replaceState(null, "", "/pt/docs/intro");

    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [SpaHomePage, SpaDocsPage],
        locales: ["en", "pt"],
    });

    await waitForNavigationReady({
        mode: "spa",
        locale: "pt",
        navigationType: "initial",
        message: "Expected the localized docs route to emit navigation ready before SEO asserts.",
    });

    assertEquals(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"),
        "https://mainz.dev/pt/docs/intro",
    );
    assertEquals(readAlternateHref("en"), "https://mainz.dev/en/docs/intro");
    assertEquals(readAlternateHref("pt"), "https://mainz.dev/pt/docs/intro");
    assertEquals(readAlternateHref("x-default"), "https://mainz.dev/en/docs/intro");

    const homeLink = document.getElementById("go-home");
    assert(homeLink instanceof HTMLElement);
    const homeReady = waitForNavigationReady({
        mode: "spa",
        locale: "en",
        navigationType: "push",
        message: "Expected the generated home link to emit navigation ready after click.",
    });
    homeLink.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    await homeReady;

    assertEquals(window.location.pathname, "/en/");
    assertEquals(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"),
        "https://mainz.dev/en/",
    );
    assertEquals(readAlternateHref("en"), "https://mainz.dev/en/");
    assertEquals(readAlternateHref("pt"), "https://mainz.dev/pt/");
    assertEquals(readAlternateHref("x-default"), "https://mainz.dev/en/");

    controller.cleanup();
});

Deno.test("navigation/runtime: should bootstrap document-first pages without app-level custom element registration", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage } = await loadSpaFixtures();
    const seenContexts: SpaNavigationRenderContext[] = [];

    document.body.innerHTML =
        `<main id="app"><${SpaHomePage.getTagName()}></${SpaHomePage.getTagName()}></main>`;

    const controller = startNavigation({
        mode: "mpa",
        mount: "#app",
        pages: [SpaHomePage],
        onRoute(context) {
            seenContexts.push(context);
        },
    });

    await waitForNavigationReady({
        mode: "mpa",
        navigationType: "initial",
        message: "Expected the document-first home page to emit navigation ready.",
    });
    await waitFor(() => seenContexts[0]?.path === "/");

    assertEquals(document.title, "Home");
    assertEquals(seenContexts[0]?.path, "/");
    assertEquals(
        document.querySelector(`#app ${SpaHomePage.getTagName()}`)?.textContent,
        "Home page",
    );

    controller.cleanup();
});

Deno.test("navigation/runtime: should resolve locales for prerendered document-first pages", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage } = await loadSpaFixtures();
    const seenLocales: string[] = [];

    document.body.innerHTML =
        `<main id="app"><${SpaHomePage.getTagName()}></${SpaHomePage.getTagName()}></main>`;
    window.history.replaceState(null, "", "/pt/");

    const controller = startNavigation({
        mode: "mpa",
        mount: "#app",
        pages: [SpaHomePage],
        locales: ["en", "pt"],
        onLocaleChange({ locale }) {
            seenLocales.push(locale);
        },
    });

    await waitForNavigationReady({
        mode: "mpa",
        locale: "pt",
        navigationType: "initial",
        message: "Expected the prerendered localized home page to emit navigation ready.",
    });

    assertEquals(document.documentElement.lang, "pt");
    assertEquals(seenLocales, ["pt"]);
    assertEquals(
        document.querySelector(`#app ${SpaHomePage.getTagName()}`)?.textContent,
        "Home page",
    );

    controller.cleanup();
});

Deno.test("navigation/runtime: should reuse route snapshot for document-first bootstrap without rerunning load", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SnapshotDocsPage, readSnapshotLoadCount, resetSnapshotLoadCount } =
        await loadSnapshotFixture();
    resetSnapshotLoadCount();

    document.body.innerHTML =
        `<main id="app"><${SnapshotDocsPage.getTagName()}></${SnapshotDocsPage.getTagName()}></main>` +
        `<script id="mainz-route-snapshot" type="application/json">${
            JSON.stringify({
                pageTagName: SnapshotDocsPage.getTagName(),
                path: "/docs/:slug",
                matchedPath: "/docs/intro",
                params: { slug: "intro" },
                locale: undefined,
                data: { slug: "intro", source: "snapshot" },
                head: { title: "Snapshot:intro" },
            })
        }</script>`;
    window.history.replaceState(null, "", "/docs/intro");

    const controller = startNavigation({
        mode: "mpa",
        mount: "#app",
        pages: [SnapshotDocsPage],
    });

    await waitForNavigationReady({
        mode: "mpa",
        navigationType: "initial",
        message: "Expected the snapshot bootstrap route to emit navigation ready.",
    });
    await waitFor(() =>
        document.querySelector(`#app ${SnapshotDocsPage.getTagName()}`)?.textContent ===
            "snapshot:intro"
    );

    assertEquals(
        document.querySelector(`#app ${SnapshotDocsPage.getTagName()}`)?.textContent,
        "snapshot:intro",
    );
    assertEquals(readSnapshotLoadCount(), 0);
    assertEquals(document.title, "Snapshot:intro");

    controller.cleanup();
});

Deno.test("navigation/runtime: should apply dynamic head from Page.load()", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SnapshotDocsPage, resetSnapshotLoadCount } = await loadSnapshotFixture();
    resetSnapshotLoadCount();

    document.body.innerHTML =
        `<main id="app"><${SnapshotDocsPage.getTagName()}></${SnapshotDocsPage.getTagName()}></main>`;
    window.history.replaceState(null, "", "/docs/routing");

    const controller = startNavigation({
        mode: "mpa",
        mount: "#app",
        pages: [SnapshotDocsPage],
    });

    await waitForNavigationReady({
        mode: "mpa",
        navigationType: "initial",
        message: "Expected the dynamic head route to emit navigation ready.",
    });

    assertEquals(
        document.querySelector(`#app ${SnapshotDocsPage.getTagName()}`)?.textContent,
        "load:routing",
    );
    assertEquals(document.title, "Snapshot:routing");

    controller.cleanup();
});

Deno.test("navigation/runtime: should intercept SPA links and render the matching page", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage, SpaDocsPage } = await loadSpaFixtures();

    document.body.innerHTML = '<main id="app"></main><a id="docs-link" href="/docs/intro">Docs</a>';
    const appRoot = document.getElementById("app");
    assert(appRoot instanceof HTMLElement);
    window.history.replaceState(null, "", "/");

    const initialReady = waitForNavigationReady({
        target: appRoot,
        path: "/",
        matchedPath: "/",
        navigationType: "initial",
    });
    const controller = startNavigation({
        mode: "spa",
        spa: {
            mount: appRoot,
            pages: [SpaHomePage, SpaDocsPage],
        },
    });
    await initialReady;

    assert(document.querySelector("#app x-mainz-navigation-spa-home-page"));

    const docsReady = waitForNavigationReady({
        target: appRoot,
        path: "/docs/:slug",
        matchedPath: "/docs/intro",
        navigationType: "push",
    });

    document.getElementById("docs-link")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await docsReady;

    assertEquals(window.location.pathname, "/docs/intro");
    assert(document.querySelector("#app x-mainz-navigation-spa-docs-page"));
    assertEquals(document.title, "Docs");
    assertEquals(
        document.querySelector("#app x-mainz-navigation-spa-docs-page")?.textContent,
        "Docs page:intro",
    );

    controller.cleanup();
});

Deno.test("navigation/runtime: should render the SPA notFound page for unknown internal links", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage, SpaDocsPage, SpaNotFoundPage } = await loadSpaFixtures();

    document.body.innerHTML =
        '<main id="app"></main><a id="missing-link" href="/missing">Missing</a>';

    const controller = startNavigation({
        mode: "spa",
        spa: {
            mount: "#app",
            pages: [SpaHomePage, SpaDocsPage],
            notFound: SpaNotFoundPage,
        },
    });
    await waitFor(() => document.querySelector("#app x-mainz-navigation-spa-home-page") !== null);

    document.getElementById("missing-link")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await waitFor(() =>
        window.location.pathname === "/missing" &&
        document.querySelector("#app x-mainz-navigation-spa-not-found-page") !== null
    );

    assertEquals(window.location.pathname, "/missing");
    assert(document.querySelector("#app x-mainz-navigation-spa-not-found-page"));
    assertEquals(document.title, "Not Found");

    controller.cleanup();
});

Deno.test("navigation/runtime: should rerender the current SPA route on popstate", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage, SpaDocsPage } = await loadSpaFixtures();

    document.body.innerHTML = '<main id="app"></main><a id="docs-link" href="/docs/intro">Docs</a>';

    const controller = startNavigation({
        mode: "spa",
        spa: {
            mount: "#app",
            pages: [SpaHomePage, SpaDocsPage],
        },
    });
    await waitFor(() => document.querySelector("#app x-mainz-navigation-spa-home-page") !== null);

    document.getElementById("docs-link")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await waitFor(() => window.location.pathname === "/docs/intro");

    window.history.pushState(null, "", "/");
    window.dispatchEvent(new Event("popstate"));
    await waitFor(() => document.querySelector("#app x-mainz-navigation-spa-home-page") !== null);

    assertEquals(window.location.pathname, "/");
    assert(document.querySelector("#app x-mainz-navigation-spa-home-page"));
    assertEquals(document.title, "Home");

    controller.cleanup();
});

Deno.test("navigation/runtime: should ignore SPA links outside the configured basePath", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage } = await loadSpaFixtures();

    document.body.innerHTML =
        '<main id="app"></main><a id="external-app-link" href="/docs/intro">Docs</a>';
    window.history.replaceState(null, "", "/app/");

    const controller = startNavigation({
        mode: "spa",
        basePath: "/app/",
        spa: {
            mount: "#app",
            pages: [
                {
                    page: SpaHomePage,
                    path: "/",
                },
            ],
        },
    });
    await waitFor(() => document.querySelector("#app x-mainz-navigation-spa-home-page") !== null);

    const outsideAppClick = new MouseEvent("click", { bubbles: true, cancelable: true });
    document.getElementById("external-app-link")?.dispatchEvent(outsideAppClick);
    await nextTick();

    assert(document.querySelector("#app x-mainz-navigation-spa-home-page"));

    controller.cleanup();
});

Deno.test("navigation/runtime: should lazy load SPA pages before rendering", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage, SpaDocsPage } = await loadSpaFixtures();

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/docs/lazy-intro");

    let loadCount = 0;

    const controller = startNavigation({
        mode: "spa",
        spa: {
            mount: "#app",
            pages: [
                SpaHomePage,
                {
                    path: "/docs/:slug",
                    async load() {
                        loadCount += 1;
                        return SpaDocsPage;
                    },
                },
            ],
        },
    });
    await waitFor(() =>
        loadCount === 1 &&
        document.querySelector("#app x-mainz-navigation-spa-docs-page") !== null
    );

    const mountedPage = document.querySelector("#app x-mainz-navigation-spa-docs-page");
    assert(mountedPage);
    assertEquals(mountedPage.textContent, "Docs page:lazy-intro");
    assertEquals(loadCount, 1);

    controller.cleanup();
});

Deno.test("navigation/runtime: should reuse the resolved SPA lazy page across navigations", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { SpaHomePage, SpaDocsPage } = await loadSpaFixtures();

    document.body.innerHTML =
        '<main id="app"></main><a id="docs-link" href="/docs/cached">Docs</a>';
    const docsLink = document.getElementById("docs-link");
    const appRoot = document.getElementById("app");
    assert(appRoot instanceof HTMLElement);
    window.history.replaceState(null, "", "/");

    let loadCount = 0;

    const initialReady = waitForNavigationReady({
        target: appRoot,
        path: "/",
        matchedPath: "/",
        navigationType: "initial",
    });
    const controller = startNavigation({
        mode: "spa",
        spa: {
            mount: appRoot,
            pages: [
                SpaHomePage,
                {
                    path: "/docs/:slug",
                    async load() {
                        loadCount += 1;
                        return { default: SpaDocsPage };
                    },
                },
            ],
        },
    });
    await initialReady;

    const firstDocsReady = waitForNavigationReady({
        target: appRoot,
        path: "/docs/:slug",
        matchedPath: "/docs/cached",
        navigationType: "push",
    });
    docsLink?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await firstDocsReady;

    window.history.pushState(null, "", "/");
    const homeReady = waitForNavigationReady({
        target: appRoot,
        path: "/",
        matchedPath: "/",
        navigationType: "pop",
    });
    window.dispatchEvent(new Event("popstate"));
    await homeReady;

    const secondDocsReady = waitForNavigationReady({
        target: appRoot,
        path: "/docs/:slug",
        matchedPath: "/docs/cached",
        navigationType: "push",
    });
    docsLink?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await secondDocsReady;

    assertEquals(loadCount, 1);
    assertEquals(
        document.querySelector("#app x-mainz-navigation-spa-docs-page")?.textContent,
        "Docs page:cached",
    );

    controller.cleanup();
});

Deno.test("navigation/runtime: should expose transition metadata in enhanced-mpa mode", async () => {
    const { detectViewTransitionSupport, startNavigation } = await prepareNavigationTest();

    const controller = startNavigation({ mode: "enhanced-mpa" });

    assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);
    assertEquals(
        document.documentElement.dataset.mainzViewTransitions,
        detectViewTransitionSupport(),
    );

    controller.cleanup();
});

Deno.test("navigation/runtime: should apply entering phase on pageshow in enhanced-mpa mode", async () => {
    const { startNavigation } = await prepareNavigationTest();

    const controller = startNavigation({ mode: "enhanced-mpa" });

    window.dispatchEvent(new Event("pageshow"));
    assertEquals(document.documentElement.dataset.mainzTransitionPhase, "entering");

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 320));
    assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);

    controller.cleanup();
});

Deno.test("navigation/runtime: should prefetch same-origin links in enhanced-mpa mode", async () => {
    const { startNavigation } = await prepareNavigationTest();

    const controller = startNavigation({ mode: "enhanced-mpa" });
    const anchor = document.createElement("a");
    const appended: Element[] = [];
    const originalAppendChild = document.head.appendChild.bind(document.head);
    document.head.appendChild = ((node: Node) => {
        appended.push(node as Element);
        return node;
    }) as typeof document.head.appendChild;

    anchor.href = "http://localhost/docs";
    anchor.textContent = "Docs";
    document.body.appendChild(anchor);

    anchor.dispatchEvent(new Event("focusin", { bubbles: true }));

    const prefetchLink = appended.find((node) =>
        node instanceof Element &&
        node.tagName === "LINK" &&
        node.getAttribute("rel") === "prefetch" &&
        node.getAttribute("href") === "http://localhost/docs"
    );

    document.head.appendChild = originalAppendChild;

    assert(prefetchLink);
    assertEquals(anchor.getAttribute("data-mainz-prefetched"), "true");

    controller.cleanup();
});

Deno.test("navigation/runtime: should not prefetch external links", async () => {
    const { isPrefetchableAnchor } = await prepareNavigationTest();

    const anchor = document.createElement("a");
    anchor.href = "https://example.com/docs";

    assertEquals(isPrefetchableAnchor(anchor), false);
});

Deno.test("navigation/runtime: should not prefetch same-origin links outside the configured basePath", async () => {
    const { isPrefetchableAnchor } = await prepareNavigationTest();

    const anchor = document.createElement("a");
    anchor.href = "http://localhost/docs";

    assertEquals(isPrefetchableAnchor(anchor, { basePath: "/app/" }), false);
});

Deno.test("navigation/runtime: should mark leaving phase for internal document navigation", async () => {
    const { startNavigation } = await prepareNavigationTest();

    const controller = startNavigation({ mode: "enhanced-mpa" });
    const anchor = document.createElement("a");
    anchor.href = "http://localhost/docs";
    document.body.appendChild(anchor);

    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    assertEquals(document.documentElement.dataset.mainzTransitionPhase, "leaving");

    controller.cleanup();
});

Deno.test("navigation/runtime: should ignore links outside the configured basePath in enhanced-mpa mode", async () => {
    const { startNavigation } = await prepareNavigationTest();

    const controller = startNavigation({ mode: "enhanced-mpa", basePath: "/app/" });
    const anchor = document.createElement("a");
    anchor.href = "http://localhost/docs";
    document.body.appendChild(anchor);

    anchor.dispatchEvent(new Event("focusin", { bubbles: true }));
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    assertEquals(anchor.getAttribute("data-mainz-prefetched"), null);
    assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);

    controller.cleanup();
});

Deno.test("navigation/runtime: should restore saved scroll position in enhanced-mpa mode", async () => {
    const { createScrollStorageKey, startNavigation } = await prepareNavigationTest();

    const calls: Array<{ x: number; y: number }> = [];
    window.scrollTo = ((x: number, y: number) => {
        calls.push({ x, y });
    }) as typeof window.scrollTo;

    window.sessionStorage.setItem(
        createScrollStorageKey(window.location),
        JSON.stringify({ x: 12, y: 48 }),
    );

    const controller = startNavigation({ mode: "enhanced-mpa" });

    assertEquals(calls, [{ x: 12, y: 48 }]);

    controller.cleanup();
});

Deno.test("navigation/runtime: should persist scroll position on pagehide in enhanced-mpa mode", async () => {
    const { createScrollStorageKey, startNavigation } = await prepareNavigationTest();

    Object.defineProperty(window, "scrollX", {
        configurable: true,
        value: 20,
    });
    Object.defineProperty(window, "scrollY", {
        configurable: true,
        value: 80,
    });

    const controller = startNavigation({ mode: "enhanced-mpa" });

    window.dispatchEvent(new Event("pagehide"));

    assertEquals(
        window.sessionStorage.getItem(createScrollStorageKey(window.location)),
        JSON.stringify({ x: 20, y: 80 }),
    );

    controller.cleanup();
});

function overrideNavigatorLocale(locale: string): void {
    const navigatorProxy = Object.create(navigator);

    Object.defineProperty(navigatorProxy, "language", {
        configurable: true,
        value: locale,
    });

    Object.defineProperty(navigatorProxy, "languages", {
        configurable: true,
        value: [locale],
    });

    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: navigatorProxy,
    });
}

function readAlternateHref(hreflang: string): string | null {
    return document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)
        ?.getAttribute("href") ?? null;
}
