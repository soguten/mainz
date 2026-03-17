/// <reference lib="deno.ns" />

import { assert, assertEquals } from "@std/assert";
import { prepareNavigationTest, waitFor } from "../../testing/index.ts";
import type { NavigationMode } from "../../routing/index.ts";

let fixturesPromise: Promise<typeof import("./navigation.route-params.fixture.ts")> | undefined;

async function loadFixtures(): Promise<typeof import("./navigation.route-params.fixture.ts")> {
    if (!fixturesPromise) {
        fixturesPromise = import("./navigation.route-params.fixture.ts");
    }

    return await fixturesPromise;
}

const spaStartupCases = [
    {
        label: "direct dynamic route",
        path: "/docs/intro",
        expectedSlug: "intro",
        expectedLocale: "en",
        expectedCanonical: "https://mainz.dev/en/docs/intro",
    },
    {
        label: "localized dynamic route with decoded params",
        path: "/pt/docs/advanced%20guide",
        expectedSlug: "advanced guide",
        expectedLocale: "pt",
        expectedCanonical: "https://mainz.dev/pt/docs/advanced%20guide",
    },
] as const;

for (const testCase of spaStartupCases) {
    Deno.test(`navigation/route params matrix: spa startup should resolve ${testCase.label}`, async () => {
        const { startNavigation } = await prepareNavigationTest();
        const { RouteParamsHomePage, RouteParamsDocsPage, RouteParamsCatchAllPage, RouteParamsNotFoundPage } =
            await loadFixtures();

        (globalThis as Record<string, unknown>).__MAINZ_DEFAULT_LOCALE__ = "en";
        (globalThis as Record<string, unknown>).__MAINZ_SITE_URL__ = "https://mainz.dev";

        document.body.innerHTML = '<main id="app"></main>';
        window.history.replaceState(null, "", testCase.path);

        const controller = startNavigation({
            mode: "spa",
            mount: "#app",
            pages: [RouteParamsHomePage, RouteParamsDocsPage, RouteParamsCatchAllPage],
            notFound: RouteParamsNotFoundPage,
            locales: ["en", "pt"],
        });

        await waitFor(() => document.title === "Docs");

        const mountedPage = document.querySelector("#app x-mainz-route-params-docs-page");
        const mountedContent = document.querySelector('#app x-mainz-route-params-docs-page [data-page="docs"]');
        assert(mountedPage);
        assert(mountedContent);
        assertEquals(mountedContent.getAttribute("data-slug"), testCase.expectedSlug);
        assertEquals(mountedContent.getAttribute("data-locale"), testCase.expectedLocale);
        assertEquals(mountedContent.getAttribute("data-title"), `${testCase.expectedLocale}:${testCase.expectedSlug}`);
        assertEquals(document.documentElement.lang, testCase.expectedLocale);
        assertEquals(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"), testCase.expectedCanonical);

        controller.cleanup();
    });
}

Deno.test("navigation/route params matrix: spa should prefer the dynamic route over catch-all routes", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { RouteParamsHomePage, RouteParamsDocsPage, RouteParamsCatchAllPage, RouteParamsNotFoundPage } =
        await loadFixtures();

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/docs/intro");

    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [RouteParamsCatchAllPage, RouteParamsDocsPage, RouteParamsHomePage],
        notFound: RouteParamsNotFoundPage,
        locales: ["en", "pt"],
    });

    await waitFor(() => document.title === "Docs");

    assert(document.querySelector("#app x-mainz-route-params-docs-page"));
    assertEquals(document.querySelector("#app x-mainz-route-params-catch-all-page"), null);

    controller.cleanup();
});

Deno.test("navigation/route params matrix: spa should fallback to catch-all params when the dynamic route does not match", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { RouteParamsHomePage, RouteParamsDocsPage, RouteParamsCatchAllPage, RouteParamsNotFoundPage } =
        await loadFixtures();

    document.body.innerHTML = '<main id="app"></main>';
    window.history.replaceState(null, "", "/docs/guides/getting-started");

    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [RouteParamsDocsPage, RouteParamsCatchAllPage, RouteParamsHomePage],
        notFound: RouteParamsNotFoundPage,
        locales: ["en", "pt"],
    });

    await waitFor(() => document.title === "Docs CatchAll");

    const mountedPage = document.querySelector("#app x-mainz-route-params-catch-all-page");
    const mountedContent = document.querySelector('#app x-mainz-route-params-catch-all-page [data-page="catch-all"]');
    assert(mountedPage);
    assert(mountedContent);
    assertEquals(mountedContent.getAttribute("data-parts"), "guides/getting-started");

    controller.cleanup();
});

Deno.test("navigation/route params matrix: spa should keep params when navigating to a lazy route", async () => {
    const { startNavigation } = await prepareNavigationTest();
    const { RouteParamsHomePage, RouteParamsDocsPage, RouteParamsNotFoundPage } = await loadFixtures();

    document.body.innerHTML = '<main id="app"></main><a id="docs-link" href="/pt/docs/lazy-intro">Docs</a>';
    let loadCount = 0;

    const controller = startNavigation({
        mode: "spa",
        mount: "#app",
        pages: [
            RouteParamsHomePage,
            {
                path: "/docs/:slug",
                async load() {
                    loadCount += 1;
                    return { default: RouteParamsDocsPage };
                },
            },
        ],
        notFound: RouteParamsNotFoundPage,
        locales: ["en", "pt"],
    });

    await waitFor(() => document.querySelector("#app x-mainz-route-params-home-page") !== null);

    document.getElementById("docs-link")?.dispatchEvent(
        new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
    );

    await waitFor(() =>
        loadCount === 1 &&
        window.location.pathname === "/pt/docs/lazy-intro" &&
        document.querySelector("#app x-mainz-route-params-docs-page") !== null
    );

    const mountedPage = document.querySelector("#app x-mainz-route-params-docs-page");
    const mountedContent = document.querySelector('#app x-mainz-route-params-docs-page [data-page="docs"]');
    assert(mountedPage);
    assert(mountedContent);
    assertEquals(mountedContent.getAttribute("data-slug"), "lazy-intro");
    assertEquals(mountedContent.getAttribute("data-title"), "pt:lazy-intro");
    assertEquals(document.documentElement.lang, "pt");

    controller.cleanup();
});

for (const navigationMode of ["mpa", "enhanced-mpa"] as const satisfies readonly NavigationMode[]) {
    Deno.test(
        `navigation/route params matrix: ${navigationMode} should apply route params to prerendered dynamic pages`,
        async () => {
            const { startNavigation } = await prepareNavigationTest();
            const { RouteParamsDocsPage, RouteParamsCatchAllPage, RouteParamsNotFoundPage } = await loadFixtures();

            (globalThis as Record<string, unknown>).__MAINZ_DEFAULT_LOCALE__ = "en";
            (globalThis as Record<string, unknown>).__MAINZ_SITE_URL__ = "https://mainz.dev";

            document.body.innerHTML =
                `<main id="app"><${RouteParamsDocsPage.getTagName()}></${RouteParamsDocsPage.getTagName()}></main>`;
            window.history.replaceState(null, "", "/pt/docs/intro");

            const controller = startNavigation({
                mode: navigationMode,
                mount: "#app",
                pages: [RouteParamsDocsPage, RouteParamsCatchAllPage],
                notFound: RouteParamsNotFoundPage,
                locales: ["en", "pt"],
            });

            await waitFor(() => {
                const mountedContent = document.querySelector(
                    `#app ${RouteParamsDocsPage.getTagName()} [data-page="docs"]`,
                );
                return document.title === "Docs" && mountedContent?.getAttribute("data-slug") === "intro";
            });

            const mountedPage = document.querySelector(`#app ${RouteParamsDocsPage.getTagName()}`);
            const mountedContent = document.querySelector(`#app ${RouteParamsDocsPage.getTagName()} [data-page="docs"]`);
            assert(mountedPage);
            assert(mountedContent);
            assertEquals(mountedContent.getAttribute("data-slug"), "intro");
            assertEquals(mountedContent.getAttribute("data-locale"), "pt");
            assertEquals(mountedContent.getAttribute("data-title"), "pt:intro");
            assertEquals(document.documentElement.lang, "pt");
            assertEquals(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"), "https://mainz.dev/pt/docs/intro");
            assertEquals(readAlternateHref("en"), "https://mainz.dev/en/docs/intro");
            assertEquals(readAlternateHref("pt"), "https://mainz.dev/pt/docs/intro");

            controller.cleanup();
        },
    );
}

function readAlternateHref(hreflang: string): string | null {
    return document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)?.getAttribute("href") ?? null;
}
