/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../../src/ssg/happy-dom.ts";
import { waitFor } from "../../../src/testing/async-testing.ts";
import {
    buildFixtureForCombination,
    cliTestCombinations,
    createCliFixtureTargetConfig,
    extractModuleScriptSrc,
    resolveOutputHtmlPath,
    resolveOutputScriptPath,
    resolvePreviewFixture,
    waitForNextNavigationReady,
} from "../../helpers/test-helpers.ts";

for (const combination of cliTestCombinations) {
    Deno.test(
        `e2e/fixture single-locale routing: ${combination.mode} + ${combination.navigation} should keep emitted routes unprefixed for a single-locale target`,
        async () => {
            const fixture = await createCliFixtureTargetConfig({
                fixtureName: "single-locale-routing",
                targetName: "fixture-single-locale-routing",
                locales: ["en"],
                defaultLocale: "en",
            });

            try {
                const context = await buildFixtureForCombination({
                    fixture,
                    combination,
                });

                await assertRootRoute(context.outputDir, combination.mode, combination.navigation);
                await assertHomeLinks(context.outputDir, combination.mode, combination.navigation);
                await assertQuickstartRoute(
                    context.outputDir,
                    combination.mode,
                    combination.navigation,
                );
            } finally {
                await fixture.cleanup();
            }
        },
    );
}

async function assertRootRoute(
    outputDir: string,
    mode: "csr" | "ssg",
    navigation: "spa" | "mpa" | "enhanced-mpa",
): Promise<void> {
    const rootHtmlPath = resolveOutputHtmlPath(outputDir, "/");
    const html = await Deno.readTextFile(rootHtmlPath);

    if (mode === "csr" && navigation === "spa") {
        const scriptSrc = extractModuleScriptSrc(html);
        assert(scriptSrc, "Could not find single-locale fixture CSR SPA root module script.");

        const scriptPath = resolveOutputScriptPath({
            outputDir,
            htmlPath: rootHtmlPath,
            scriptSrc,
        });
        await Deno.stat(scriptPath);

        await withHappyDom(async (window) => {
            document.write(html);
            document.close();

            await import(
                `${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${mode}-${navigation}-root`
            );
            await waitFor(() => window.location.pathname === "/");
        }, { url: "https://mainz.local/" });

        return;
    }

    await withHappyDom(async (window) => {
        document.write(html);
        document.close();
        assertEquals(window.location.pathname, "/");
    }, { url: "https://mainz.local/" });
}

async function assertHomeLinks(
    outputDir: string,
    mode: "csr" | "ssg",
    navigation: "spa" | "mpa" | "enhanced-mpa",
): Promise<void> {
    const fixture = await resolveRouteFixture(outputDir, mode, navigation, "/");
    const scriptSrc = extractModuleScriptSrc(fixture.html);
    assert(
        scriptSrc,
        `Could not find single-locale fixture module script for ${mode} + ${navigation} (/).`,
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

        const navigationReady = waitForNextNavigationReady({
            mode: navigation,
            locale: "en",
            navigationType: "initial",
        });
        await import(
            `${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${mode}-${navigation}-home`
        );
        await navigationReady;
        await waitFor(
            () =>
                document.documentElement.dataset.mainzNavigation === navigation &&
                document.documentElement.lang === "en" &&
                readAnchorHref("Overview") === "/" &&
                readAnchorHref("Guides") === "/quickstart" &&
                readAnchorHref("Reference") === "/reference",
        );

        assertEquals(document.documentElement.lang, "en");
        assertEquals(readAnchorHref("Overview"), "/");
        assertEquals(readAnchorHref("Guides"), "/quickstart");
        assertEquals(readAnchorHref("Reference"), "/reference");

        if (navigation === "spa") {
            const guidesLink = Array.from(document.querySelectorAll("a"))
                .find((anchor) => anchor.textContent?.trim() === "Guides");
            assert(guidesLink instanceof HTMLElement);

            guidesLink.dispatchEvent(
                new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
            );
            await waitFor(() =>
                window.location.pathname === "/quickstart" &&
                (document.body.textContent ?? "").includes("Why Mainz")
            );
        }
    }, { url: "https://mainz.local/" });
}

async function assertQuickstartRoute(
    outputDir: string,
    mode: "csr" | "ssg",
    navigation: "spa" | "mpa" | "enhanced-mpa",
): Promise<void> {
    const fixture = await resolveRouteFixture(outputDir, mode, navigation, "/quickstart");
    const scriptSrc = extractModuleScriptSrc(fixture.html);
    assert(
        scriptSrc,
        `Could not find single-locale fixture module script for ${mode} + ${navigation} (/quickstart).`,
    );

    const scriptPath = resolveOutputScriptPath({
        outputDir: fixture.outputDir,
        htmlPath: fixture.htmlPath,
        scriptSrc,
    });
    await Deno.stat(scriptPath);

    if (fixture.responseStatus !== undefined) {
        assertEquals(fixture.responseStatus, 200);
    }

    await withHappyDom(async () => {
        document.write(fixture.html);
        document.close();

        const navigationReady = waitForNextNavigationReady({
            mode: navigation,
            locale: "en",
            navigationType: "initial",
        });
        await import(
            `${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${mode}-${navigation}-quickstart`
        );
        await navigationReady;
        await waitFor(
            () =>
                document.documentElement.dataset.mainzNavigation === navigation &&
                document.documentElement.lang === "en" &&
                (document.body.textContent ?? "").includes("Why Mainz") &&
                readAnchorHref("Guides") === "/quickstart",
        );

        assertEquals(document.documentElement.lang, "en");
        assertStringIncludes(document.body.textContent ?? "", "Why Mainz");
        assertStringIncludes(document.body.textContent ?? "", "Create your first page.");
        assertEquals(readAnchorHref("Guides"), "/quickstart");
    }, { url: "https://mainz.local/quickstart" });
}

async function resolveRouteFixture(
    outputDir: string,
    renderMode: "csr" | "ssg",
    navigationMode: "spa" | "mpa" | "enhanced-mpa",
    routePath: string,
): Promise<{ html: string; htmlPath: string; outputDir: string; responseStatus?: number }> {
    return await resolvePreviewFixture({
        outputDir,
        renderMode,
        navigationMode,
        requestUrl: `http://127.0.0.1:4175${routePath}`,
        resolveHtmlPath() {
            return resolveOutputHtmlPath(outputDir, routePath);
        },
    });
}

function readAnchorHref(label: string): string | null {
    const anchor = Array.from(document.querySelectorAll("a"))
        .find((candidate) => candidate.textContent?.trim() === label);
    return anchor?.getAttribute("href") ?? null;
}
