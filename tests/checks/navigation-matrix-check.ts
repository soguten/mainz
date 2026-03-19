/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../src/ssg/happy-dom.ts";
import { nextTick, waitFor } from "../../src/testing/async-testing.ts";
import {
    buildCoreContractsForCombination,
    type CliBuildContext,
    extractModuleScriptSrc,
    parseCliMatrixCheckArgs,
    resolveDirectLoadFixture,
    resolveOutputScriptPath,
} from "../helpers/test-helpers.ts";

export async function runNavigationMatrixCheck(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    context?: CliBuildContext;
}): Promise<void> {
    const context = args.context ?? await buildCoreContractsForCombination(args);

    try {
        const fixture = await resolveHtmlFixture(context);
        const scriptSrc = extractModuleScriptSrc(fixture.html);
        assert(
            scriptSrc,
            `Could not find module script src for ${context.mode} + ${context.navigation}.`,
        );

        const scriptPath = resolveOutputScriptPath({
            outputDir: fixture.outputDir,
            htmlPath: fixture.htmlPath,
            scriptSrc,
        });
        await Deno.stat(scriptPath);

        await withHappyDom(async () => {
            document.write(fixture.html);
            document.close();

            await import(
                `${
                    pathToFileURL(scriptPath).href
                }?e2e=${Date.now()}-${context.mode}-${context.navigation}`
            );
            await waitFor(() =>
                document.querySelector<HTMLAnchorElement>('.locale-chip[data-locale="pt"]') !==
                    null &&
                document.documentElement.lang === "en"
            );

            assertEquals(document.documentElement.dataset.mainzNavigation, context.navigation);
            assertStringIncludes(document.body.textContent ?? "", "Start guided journey");

            const localeLink = document.querySelector<HTMLAnchorElement>(
                '.locale-chip[data-locale="pt"]',
            );
            assert(localeLink, "Expected the PT locale switcher link to be rendered.");
            assertEquals(localeLink.getAttribute("href"), "/pt/");

            const initialText = document.body.textContent ?? "";

            localeLink.dispatchEvent(new Event("focusin", { bubbles: true }));
            await nextTick();

            const prefetchHref =
                document.head.querySelector('link[rel="prefetch"][as="document"]')?.getAttribute(
                    "href",
                ) ??
                    null;
            const clickEvent = new window.MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                button: 0,
            });
            const clickResult = localeLink.dispatchEvent(clickEvent);
            await waitForPostClick(context.navigation);

            if (context.navigation === "spa") {
                assertEquals(clickResult, false);
                assertEquals(clickEvent.defaultPrevented, true);
                assertEquals(window.location.pathname, "/pt/");
                assertEquals(document.documentElement.lang, "pt");
                assertStringIncludes(document.body.textContent ?? "", "Iniciar trilha guiada");
                assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);
                assertEquals(prefetchHref, null);
                return;
            }

            assertEquals(clickResult, true);
            assertEquals(clickEvent.defaultPrevented, false);
            assertEquals(document.documentElement.lang, "en");
            assertStringIncludes(document.body.textContent ?? "", "Start guided journey");
            assertEquals(document.body.textContent ?? "", initialText);

            if (context.navigation === "enhanced-mpa") {
                assertEquals(prefetchHref, "https://mainz.local/pt/");
                assertEquals(document.documentElement.dataset.mainzTransitionPhase, "leaving");
                return;
            }

            assertEquals(prefetchHref, null);
            assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);
        }, { url: fixture.url });
    } finally {
        if (!args.context) {
            await context.cleanup?.();
        }
    }
}

async function resolveHtmlFixture(
    context: CliBuildContext,
): Promise<{ html: string; htmlPath: string; outputDir: string; url: string }> {
    const outputDir = context.outputDir;
    return {
        ...(await resolveDirectLoadFixture({
            outputDir,
            renderMode: context.mode,
            navigationMode: context.navigation,
            documentHtmlPath: "en/index.html",
            url: "https://mainz.local/en/",
        })),
        url: "https://mainz.local/en/",
    };
}

async function waitForPostClick(navigationMode: "spa" | "mpa" | "enhanced-mpa"): Promise<void> {
    if (navigationMode === "spa") {
        await waitFor(
            () =>
                window.location.pathname === "/pt/" &&
                document.documentElement.lang === "pt" &&
                (document.body.textContent ?? "").includes("Iniciar trilha guiada"),
            `Expected SPA locale switch to land on /pt/. Received pathname=${window.location.pathname}, lang=${document.documentElement.lang}, title=${document.title}.`,
        );
        return;
    }

    await nextTick();
}

if (import.meta.main) {
    const args = parseCliMatrixCheckArgs("navigation-matrix-check.ts", Deno.args);
    await runNavigationMatrixCheck(args);
}
