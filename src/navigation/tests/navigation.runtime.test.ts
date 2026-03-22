/// <reference lib="deno.ns" />

import { assert, assertEquals } from "@std/assert";
import { nextTick, prepareNavigationTest, waitFor } from "../../testing/index.ts";
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

    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [SpaHomePage, SpaDocsPage],
        onRoute(context) {
            seenContexts.push(context);
        },
    });
    await waitFor(() => document.title === "Docs");

    const mountedPage = document.querySelector("#app x-mainz-navigation-spa-docs-page");
    const mountedContent = document.querySelector(
        '#app x-mainz-navigation-spa-docs-page [data-page="docs"]',
    );
    assert(mountedPage);
    assert(mountedContent);
    assertEquals(document.title, "Docs");
    assertEquals(mountedPage.textContent, "Docs page:intro");
    assertEquals(mountedContent.getAttribute("data-slug"), "intro");
    assertEquals(seenContexts[0]?.path, "/docs/:slug");
    assertEquals(seenContexts[0]?.matchedPath, "/docs/intro");
    assertEquals(seenContexts[0]?.params.slug, "intro");

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
    await waitFor(() => document.title === "Not Found");

    assert(document.querySelector("#app x-mainz-navigation-spa-not-found-page"));
    assertEquals(document.title, "Not Found");

    controller.cleanup();
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

    await waitFor(() => document.title === "Home" && document.documentElement.lang === "pt");

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

    await waitFor(() => document.title === "Docs");

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

    await waitFor(() => window.location.pathname === "/pt/" && document.title === "Home");

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

    await waitFor(() => window.location.pathname === "/en/" && document.title === "Home");

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

    await waitFor(() => window.location.pathname === "/" && document.title === "Home");

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

    await waitFor(() => document.title === "Docs");

    assertEquals(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"),
        "https://mainz.dev/pt/docs/intro",
    );
    assertEquals(readAlternateHref("en"), "https://mainz.dev/en/docs/intro");
    assertEquals(readAlternateHref("pt"), "https://mainz.dev/pt/docs/intro");
    assertEquals(readAlternateHref("x-default"), "https://mainz.dev/en/docs/intro");

    const homeLink = document.getElementById("go-home");
    assert(homeLink instanceof HTMLElement);
    homeLink.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));

    await waitFor(() => document.title === "Home");

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

    await waitFor(() => document.title === "Home" && seenContexts[0]?.path === "/");

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

    await waitFor(() => document.title === "Home" && document.documentElement.lang === "pt");

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

    for (let attempt = 0; attempt < 75; attempt += 1) {
        if (
            document.querySelector(`#app ${SnapshotDocsPage.getTagName()}`)?.textContent ===
                "snapshot:intro"
        ) {
            break;
        }

        await nextTick();
    }

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

    await waitFor(() => document.title === "Snapshot:routing");

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

    const controller = startNavigation({
        mode: "spa",
        spa: {
            mount: "#app",
            pages: [SpaHomePage, SpaDocsPage],
        },
    });
    await waitFor(() => document.querySelector("#app x-mainz-navigation-spa-home-page") !== null);

    assert(document.querySelector("#app x-mainz-navigation-spa-home-page"));

    document.getElementById("docs-link")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await waitFor(() =>
        window.location.pathname === "/docs/intro" &&
        document.querySelector("#app x-mainz-navigation-spa-docs-page") !== null
    );

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
                        return { default: SpaDocsPage };
                    },
                },
            ],
        },
    });
    await waitFor(() => document.querySelector("#app x-mainz-navigation-spa-home-page") !== null);

    docsLink?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await waitFor(() =>
        loadCount === 1 &&
        window.location.pathname === "/docs/cached" &&
        document.querySelector("#app x-mainz-navigation-spa-docs-page") !== null
    );

    window.history.pushState(null, "", "/");
    window.dispatchEvent(new Event("popstate"));
    await waitFor(() => document.querySelector("#app x-mainz-navigation-spa-home-page") !== null);

    docsLink?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await waitFor(() => document.querySelector("#app x-mainz-navigation-spa-docs-page") !== null);

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
