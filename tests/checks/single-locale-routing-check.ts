/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../src/ssg/happy-dom.ts";
import { nextTick, waitFor } from "../../src/testing/async-testing.ts";
import {
    cliTestsRepoRoot as repoRoot,
    extractModuleScriptSrc,
    resolveOutputHtmlPath,
    resolveOutputScriptPath,
    resolvePreviewFixture,
    runMainzCliCommand,
} from "../helpers/test-helpers.ts";

const [mode, navigation] = Deno.args as [("csr" | "ssg")?, ("spa" | "mpa" | "enhanced-mpa")?];

if (!mode || !navigation) {
    throw new Error(
        "Usage: deno run -A ./tests/checks/single-locale-routing-check.ts <mode> <navigation>",
    );
}

await runMainzCliCommand(
    [
        "build",
        "--target",
        "docs",
        "--mode",
        mode,
        "--navigation",
        navigation,
    ],
    "Failed to build docs for single-locale routing check.",
);

await assertRootRoute({ mode, navigation });
await assertHomeLinks({ mode, navigation });
await assertDocsRoute({ mode, navigation });

async function assertRootRoute(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
}): Promise<void> {
    const outputDir = resolve(repoRoot, `dist/docs/${args.mode}`);
    const rootHtmlPath = resolve(outputDir, "index.html");
    const html = await Deno.readTextFile(rootHtmlPath);

    if (args.mode === "csr" && args.navigation === "spa") {
        const scriptSrc = extractModuleScriptSrc(html);
        assert(scriptSrc, "Could not find single-locale CSR SPA root module script.");

        const scriptPath = resolveOutputScriptPath({
            outputDir,
            htmlPath: rootHtmlPath,
            scriptSrc,
        });
        await Deno.stat(scriptPath);

        await withHappyDom(async (window) => {
            overrideGlobalNavigatorLocale("en-US");
            document.write(html);
            document.close();

            await import(
                `${
                    pathToFileURL(scriptPath).href
                }?e2e=${Date.now()}-${args.mode}-${args.navigation}-root`
            );
            await waitFor(() => window.location.pathname === "/");
        }, { url: "https://mainz.local/" });

        return;
    }

    await withHappyDom(async (window) => {
        overrideNavigatorLocale(window.navigator, "en-US");
        document.write(html);
        document.close();
        assertEquals(window.location.pathname, "/");
    }, { url: "https://mainz.local/" });
}

async function assertHomeLinks(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
}): Promise<void> {
    const fixture = await resolveRouteFixture(args.mode, args.navigation, "/");
    const scriptSrc = extractModuleScriptSrc(fixture.html);
    assert(
        scriptSrc,
        `Could not find single-locale module script for ${args.mode} + ${args.navigation} (/).`,
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
            }?e2e=${Date.now()}-${args.mode}-${args.navigation}-home`
        );
        await waitFor(() => document.title === "Mainz Docs");

        assertEquals(document.documentElement.lang, "en");
        assertEquals(readAnchorHref("Overview"), "/");
        assertEquals(readAnchorHref("Guides"), "/quickstart");
        assertEquals(readAnchorHref("Reference"), "/data-loading");
        assert(document.querySelector('a[href="/quickstart"]'));

        if (args.navigation === "spa") {
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

async function assertDocsRoute(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
}): Promise<void> {
    const fixture = await resolveRouteFixture(args.mode, args.navigation, "/quickstart");
    const scriptSrc = extractModuleScriptSrc(fixture.html);
    assert(
        scriptSrc,
        `Could not find single-locale module script for ${args.mode} + ${args.navigation} (/quickstart).`,
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

        await import(
            `${
                pathToFileURL(scriptPath).href
            }?e2e=${Date.now()}-${args.mode}-${args.navigation}-quickstart`
        );
        await waitFor(() => (document.body.textContent ?? "").includes("Why Mainz"));

        assertEquals(document.documentElement.lang, "en");
        assertStringIncludes(document.body.textContent ?? "", "Why Mainz");
        assertStringIncludes(document.body.textContent ?? "", "Create your first page");
        assert(!(document.body.textContent ?? "").includes("Document not found"));
        assertEquals(readAnchorHref("Guides"), "/quickstart");
    }, { url: "https://mainz.local/quickstart" });
}

async function resolveRouteFixture(
    renderMode: "csr" | "ssg",
    navigationMode: "spa" | "mpa" | "enhanced-mpa",
    routePath: string,
): Promise<{ html: string; htmlPath: string; outputDir: string; responseStatus?: number }> {
    const outputDir = resolve(repoRoot, `dist/docs/${renderMode}`);
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

function extractInlineRedirectScript(html: string): string | null {
    const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/i);
    return match?.[1]?.trim() ?? null;
}

function readAnchorHref(label: string): string | null {
    const anchor = Array.from(document.querySelectorAll("a"))
        .find((candidate) => candidate.textContent?.trim() === label);
    return anchor?.getAttribute("href") ?? null;
}

function overrideNavigatorLocale(
    navigatorLike: {
        language?: string;
        languages?: readonly string[];
    },
    locale: string,
): void {
    Object.defineProperty(navigatorLike, "language", {
        configurable: true,
        value: locale,
    });

    Object.defineProperty(navigatorLike, "languages", {
        configurable: true,
        value: [locale],
    });
}

function overrideGlobalNavigatorLocale(locale: string): void {
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
        writable: true,
        value: navigatorProxy,
    });
}
