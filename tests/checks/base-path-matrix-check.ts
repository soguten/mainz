/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../src/ssg/happy-dom.ts";
import { nextTick, waitFor } from "../../src/testing/async-testing.ts";
import {
    assertDocumentState,
    assertSeoState,
    buildFixtureForCombination,
    type CliTestNavigationMode,
    type CliTestRenderMode,
    createCliFixtureTargetConfig,
    extractModuleScriptSrc,
    readAlternateHref,
    readCanonicalHref,
    resolveDirectLoadFixture,
    resolveOutputScriptPath,
    waitForNextNavigationStart,
    waitForNextNavigationReady,
} from "../helpers/test-helpers.ts";
const matrixBasePath = "/docs/mainz/";
const matrixSiteUrl = "https://example.com/docs/mainz";

const [mode, navigation] = Deno.args as [("csr" | "ssg")?, ("spa" | "mpa" | "enhanced-mpa")?];

if (!mode || !navigation) {
    throw new Error(
        "Usage: deno run -A ./tests/checks/base-path-matrix-check.ts <mode> <navigation>",
    );
}

const fixture = await createCliFixtureTargetConfig({
    fixtureName: "base-path",
    targetName: "fixture-base-path",
});

try {
    const context = await buildFixtureForCombination({
        fixture,
        combination: { mode, navigation },
        profile: "gh-pages",
    });

    await assertLocalizedHomeRoute({
        mode,
        navigation,
        outputDir: context.outputDir,
    });

    await assertLocalizedNotFoundRoute({
        mode,
        navigation,
        outputDir: context.outputDir,
    });
} finally {
    await fixture.cleanup();
}

async function assertLocalizedHomeRoute(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    outputDir: string;
}): Promise<void> {
    const htmlFixture = await resolveHomeFixture(args.outputDir, args.mode, args.navigation);
    const scriptSrc = extractModuleScriptSrc(htmlFixture.html);
    assert(
        scriptSrc,
        `Could not find module script src for localized home route (${args.mode} + ${args.navigation}).`,
    );

    const scriptPath = resolveOutputScriptPath({
        outputDir: args.outputDir,
        htmlPath: htmlFixture.htmlPath,
        scriptSrc,
        basePath: matrixBasePath,
    });
    await Deno.stat(scriptPath);

    await withHappyDom(async () => {
        document.write(htmlFixture.html);
        document.close();

        const navigationReady = waitForNextNavigationReady({
            mode: args.navigation,
            locale: "en",
            navigationType: "initial",
        });
        await import(
            `${
                pathToFileURL(scriptPath).href
            }?e2e=${Date.now()}-${args.mode}-${args.navigation}-home`
        );
        await navigationReady;
        await waitFor(
            () =>
                document.documentElement.dataset.mainzNavigation === args.navigation &&
                document.documentElement.lang === "en" &&
                document.querySelector<HTMLAnchorElement>('.locale-chip[data-locale="pt"]')
                        ?.getAttribute("href") === `${matrixBasePath}pt/` &&
                readCanonicalHref() === `${matrixSiteUrl}/en/` &&
                readAlternateHref("pt") === `${matrixSiteUrl}/pt/`,
            `Expected ${args.mode} + ${args.navigation} basePath home route to finish bootstrapping.`,
        );

        assertDocumentState({
            navigation: args.navigation,
            locale: "en",
            bodyIncludes: "Fixture home",
        });
        assertEquals(window.location.pathname, `${matrixBasePath}en/`);
        assertSeoState({
            canonical: `${matrixSiteUrl}/en/`,
            alternates: {
                pt: `${matrixSiteUrl}/pt/`,
            },
        });

        const localeLink = document.querySelector<HTMLAnchorElement>(
            '.locale-chip[data-locale="pt"]',
        );
        assert(localeLink, "Expected the PT locale switcher link to exist under a basePath.");
        assertEquals(localeLink.getAttribute("href"), `${matrixBasePath}pt/`);

        localeLink.dispatchEvent(new Event("focusin", { bubbles: true }));
        await nextTick();

        const prefetchHref =
            document.head.querySelector('link[rel="prefetch"][as="document"]')?.getAttribute(
                "href",
            ) ?? null;
        const clickEvent = new window.MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            button: 0,
        });
        const started = args.navigation === "spa"
            ? waitForNextNavigationStart({
                mode: "spa",
                path: "/",
                matchedPath: "/",
                locale: "pt",
                navigationType: "push",
            })
            : undefined;
        const clickResult = localeLink.dispatchEvent(clickEvent);
        await waitForHomeClick(args.navigation, started);

        if (args.navigation === "spa") {
            assertEquals(clickResult, false);
            assertEquals(clickEvent.defaultPrevented, true);
            assertEquals(window.location.pathname, `${matrixBasePath}pt/`);
            assertDocumentState({
                locale: "pt",
                bodyIncludes: "Inicio da fixture",
            });
            assertSeoState({
                canonical: `${matrixSiteUrl}/pt/`,
            });
            assertEquals(prefetchHref, null);
            assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);
            return;
        }

        assertEquals(clickResult, true);
        assertEquals(clickEvent.defaultPrevented, false);
        assertEquals(window.location.pathname, `${matrixBasePath}pt/`);
        assertDocumentState({
            locale: "en",
            bodyIncludes: "Fixture home",
        });

        if (args.navigation === "enhanced-mpa") {
            assertEquals(prefetchHref, `https://mainz.local${matrixBasePath}pt/`);
            assertEquals(document.documentElement.dataset.mainzTransitionPhase, "leaving");
            return;
        }

        assertEquals(prefetchHref, null);
        assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);
    }, { url: `${matrixSiteUrl.replace("https://example.com", "https://mainz.local")}/en/` });
}

async function assertLocalizedNotFoundRoute(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    outputDir: string;
}): Promise<void> {
    const htmlFixture = await resolveNotFoundFixture(args.outputDir, args.mode, args.navigation);
    const scriptSrc = extractModuleScriptSrc(htmlFixture.html);
    assert(
        scriptSrc,
        `Could not find module script src for localized notFound route (${args.mode} + ${args.navigation}).`,
    );

    const scriptPath = resolveOutputScriptPath({
        outputDir: args.outputDir,
        htmlPath: htmlFixture.htmlPath,
        scriptSrc,
        basePath: matrixBasePath,
    });
    await Deno.stat(scriptPath);

    await withHappyDom(async () => {
        document.write(htmlFixture.html);
        document.close();

        const navigationReady = waitForNextNavigationReady({
            mode: args.navigation,
            locale: "pt",
            navigationType: "initial",
        });
        await import(
            `${
                pathToFileURL(scriptPath).href
            }?e2e=${Date.now()}-${args.mode}-${args.navigation}-404`
        );
        await navigationReady;
        await waitFor(
            () =>
                document.documentElement.dataset.mainzNavigation === args.navigation &&
                document.documentElement.lang === "pt" &&
                document.querySelector<HTMLAnchorElement>('.locale-chip[data-locale="en"]')
                        ?.getAttribute("href") === `${matrixBasePath}en/nao-existe` &&
                readCanonicalHref() === `${matrixSiteUrl}/pt/nao-existe` &&
                readAlternateHref("en") === `${matrixSiteUrl}/en/nao-existe`,
            `Expected ${args.mode} + ${args.navigation} localized 404 route to finish bootstrapping.`,
        );

        assertDocumentState({
            navigation: args.navigation,
            locale: "pt",
            bodyIncludes: "Essa rota nao existe na fixture.",
        });

        const localeLink = document.querySelector<HTMLAnchorElement>(
            '.locale-chip[data-locale="en"]',
        );
        assert(
            localeLink,
            "Expected the EN locale switcher link to exist on the localized 404 page.",
        );
        assertEquals(localeLink.getAttribute("href"), `${matrixBasePath}en/nao-existe`);

        assertSeoState({
            canonical: `${matrixSiteUrl}/pt/nao-existe`,
            alternates: {
                en: `${matrixSiteUrl}/en/nao-existe`,
                pt: `${matrixSiteUrl}/pt/nao-existe`,
            },
        });
    }, {
        url: `${matrixSiteUrl.replace("https://example.com", "https://mainz.local")}/pt/nao-existe`,
    });
}

async function resolveHomeFixture(
    outputDir: string,
    renderMode: CliTestRenderMode,
    navigationMode: CliTestNavigationMode,
): Promise<{ html: string; htmlPath: string }> {
    const fixture = await resolveDirectLoadFixture({
        outputDir,
        renderMode,
        navigationMode,
        documentHtmlPath: "en/index.html",
    });

    return {
        html: fixture.html,
        htmlPath: fixture.htmlPath,
    };
}

async function resolveNotFoundFixture(
    outputDir: string,
    renderMode: CliTestRenderMode,
    navigationMode: CliTestNavigationMode,
): Promise<{ html: string; htmlPath: string }> {
    const fixture = await resolveDirectLoadFixture({
        outputDir,
        renderMode,
        navigationMode,
        documentHtmlPath: "404.html",
    });

    return {
        html: fixture.html,
        htmlPath: fixture.htmlPath,
    };
}

async function waitForHomeClick(
    navigationMode: "spa" | "mpa" | "enhanced-mpa",
    started?: Promise<unknown>,
): Promise<void> {
    if (navigationMode === "spa") {
        await Promise.all([
            started,
            waitForNextNavigationReady({
                mode: "spa",
                path: "/",
                matchedPath: "/",
                locale: "pt",
                navigationType: "push",
            }),
        ]);
        return;
    }

    await nextTick();
}
