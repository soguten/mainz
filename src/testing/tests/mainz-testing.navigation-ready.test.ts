/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import {
    MAINZ_NAVIGATION_ABORT_EVENT,
    MAINZ_NAVIGATION_ERROR_EVENT,
    MAINZ_NAVIGATION_READY_EVENT,
    MAINZ_NAVIGATION_START_EVENT,
} from "../../runtime-events.ts";
import {
    setupMainzDom,
    waitForNavigationAbort,
    waitForNavigationError,
    waitForNavigationReady,
    waitForNavigationStart,
} from "../index.ts";

await setupMainzDom();

Deno.test("testing helper/navigation-ready: should resolve the next navigation-ready event", async () => {
    const ready = waitForNavigationReady({
        mode: "spa",
        matchedPath: "/docs/intro",
    });

    document.dispatchEvent(
        new CustomEvent(MAINZ_NAVIGATION_READY_EVENT, {
            detail: {
                mode: "spa",
                navigationType: "initial",
                path: "/docs/:slug",
                matchedPath: "/docs/intro",
                locale: "en",
                url: "https://mainz.local/docs/intro",
                basePath: "/",
                navigationSequence: 1,
            },
        }),
    );

    assertEquals(await ready, {
        mode: "spa",
        navigationType: "initial",
        path: "/docs/:slug",
        matchedPath: "/docs/intro",
        locale: "en",
        url: "https://mainz.local/docs/intro",
        basePath: "/",
        navigationSequence: 1,
    });
});

Deno.test("testing helper/navigation-ready: should narrow repeated navigations by sequence", async () => {
    const ready = waitForNavigationReady({
        navigationSequence: 2,
    });

    document.dispatchEvent(
        new CustomEvent(MAINZ_NAVIGATION_READY_EVENT, {
            detail: {
                mode: "spa",
                navigationType: "initial",
                path: "/",
                matchedPath: "/",
                locale: "en",
                url: "https://mainz.local/",
                basePath: "/",
                navigationSequence: 1,
            },
        }),
    );

    document.dispatchEvent(
        new CustomEvent(MAINZ_NAVIGATION_READY_EVENT, {
            detail: {
                mode: "spa",
                navigationType: "push",
                path: "/docs/:slug",
                matchedPath: "/docs/intro",
                locale: "en",
                url: "https://mainz.local/docs/intro",
                basePath: "/",
                navigationSequence: 2,
            },
        }),
    );

    assertEquals((await ready).navigationSequence, 2);
});

Deno.test("testing helper/navigation-ready: should support waiting on a specific app target", async () => {
    const appRoot = document.createElement("main");
    document.body.appendChild(appRoot);

    const ready = waitForNavigationReady({
        target: appRoot,
        navigationSequence: 1,
    });

    appRoot.dispatchEvent(
        new CustomEvent(MAINZ_NAVIGATION_READY_EVENT, {
            detail: {
                mode: "spa",
                navigationType: "initial",
                path: "/",
                matchedPath: "/",
                locale: "en",
                url: "https://mainz.local/",
                basePath: "/",
                navigationSequence: 1,
            },
            bubbles: true,
        }),
    );

    assertEquals((await ready).matchedPath, "/");
});

Deno.test("testing helper/navigation-start: should resolve the next navigation-start event", async () => {
    const started = waitForNavigationStart({
        mode: "spa",
        matchedPath: "/docs/intro",
    });

    document.dispatchEvent(
        new CustomEvent(MAINZ_NAVIGATION_START_EVENT, {
            detail: {
                mode: "spa",
                navigationType: "push",
                path: "/docs/:slug",
                matchedPath: "/docs/intro",
                locale: "en",
                url: "https://mainz.local/docs/intro",
                basePath: "/",
                navigationSequence: 2,
            },
        }),
    );

    assertEquals((await started).navigationSequence, 2);
});

Deno.test("testing helper/navigation-error: should narrow by phase and sequence", async () => {
    const failed = waitForNavigationError({
        phase: "route-load",
        navigationSequence: 3,
    });

    document.dispatchEvent(
        new CustomEvent(MAINZ_NAVIGATION_ERROR_EVENT, {
            detail: {
                mode: "spa",
                navigationType: "push",
                path: "/docs/:slug",
                matchedPath: "/docs/broken",
                locale: "en",
                url: "https://mainz.local/docs/broken",
                basePath: "/",
                navigationSequence: 2,
                phase: "route-load",
                message: "ignore me",
            },
        }),
    );

    document.dispatchEvent(
        new CustomEvent(MAINZ_NAVIGATION_ERROR_EVENT, {
            detail: {
                mode: "spa",
                navigationType: "push",
                path: "/docs/:slug",
                matchedPath: "/docs/broken",
                locale: "en",
                url: "https://mainz.local/docs/broken",
                basePath: "/",
                navigationSequence: 3,
                phase: "route-load",
                message: "Broken route load.",
            },
        }),
    );

    assertEquals((await failed).message, "Broken route load.");
});

Deno.test("testing helper/navigation-error: should not resolve before the explicit error event fires", async () => {
    document.title = "Broken docs";
    document.body.innerHTML = `
        <main id="app">
            <section data-page="broken-docs">Broken docs</section>
        </main>
    `;

    const failed = waitForNavigationError({
        phase: "route-load",
        matchedPath: "/docs/broken",
        message: "Expected navigation-error event for /docs/broken.",
    });
    let resolved = false;
    void failed.then(() => {
        resolved = true;
    });

    await Promise.resolve();

    assertEquals(document.title, "Broken docs");
    assertEquals(
        document.querySelector('[data-page="broken-docs"]')?.textContent,
        "Broken docs",
    );
    assertEquals(resolved, false);

    document.dispatchEvent(
        new CustomEvent(MAINZ_NAVIGATION_ERROR_EVENT, {
            detail: {
                mode: "spa",
                navigationType: "push",
                path: "/docs/:slug",
                matchedPath: "/docs/broken",
                locale: "en",
                url: "https://mainz.local/docs/broken",
                basePath: "/",
                navigationSequence: 4,
                phase: "route-load",
                message: "Broken route load.",
            },
        }),
    );

    assertEquals((await failed).navigationSequence, 4);
    assertEquals(resolved, true);
});

Deno.test("testing helper/navigation-abort: should narrow by reason and sequence", async () => {
    const aborted = waitForNavigationAbort({
        reason: "superseded",
        navigationSequence: 6,
    });

    document.dispatchEvent(
        new CustomEvent(MAINZ_NAVIGATION_ABORT_EVENT, {
            detail: {
                mode: "spa",
                navigationType: "push",
                path: "/slow",
                matchedPath: "/slow",
                locale: "en",
                url: "https://mainz.local/slow",
                basePath: "/",
                navigationSequence: 5,
                reason: "superseded",
            },
        }),
    );

    document.dispatchEvent(
        new CustomEvent(MAINZ_NAVIGATION_ABORT_EVENT, {
            detail: {
                mode: "spa",
                navigationType: "push",
                path: "/slow",
                matchedPath: "/slow",
                locale: "en",
                url: "https://mainz.local/slow",
                basePath: "/",
                navigationSequence: 6,
                reason: "superseded",
            },
        }),
    );

    assertEquals((await aborted).navigationSequence, 6);
});

Deno.test("testing helper/navigation-abort: should support waiting on a specific app target", async () => {
    const appRoot = document.createElement("main");
    const otherRoot = document.createElement("main");
    document.body.append(appRoot, otherRoot);

    const aborted = waitForNavigationAbort({
        target: appRoot,
        reason: "cleanup",
    });

    otherRoot.dispatchEvent(
        new CustomEvent(MAINZ_NAVIGATION_ABORT_EVENT, {
            detail: {
                mode: "spa",
                navigationType: "push",
                path: "/slow",
                matchedPath: "/slow",
                locale: "en",
                url: "https://mainz.local/slow",
                basePath: "/",
                navigationSequence: 7,
                reason: "cleanup",
            },
            bubbles: true,
        }),
    );

    appRoot.dispatchEvent(
        new CustomEvent(MAINZ_NAVIGATION_ABORT_EVENT, {
            detail: {
                mode: "spa",
                navigationType: "push",
                path: "/slow",
                matchedPath: "/slow",
                locale: "en",
                url: "https://mainz.local/slow",
                basePath: "/",
                navigationSequence: 8,
                reason: "cleanup",
            },
            bubbles: true,
        }),
    );

    assertEquals((await aborted).navigationSequence, 8);
});
