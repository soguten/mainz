/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../../ssg/happy-dom.ts";
import { nextTick, waitFor } from "../../../testing/async-testing.ts";
import {
    assertDocumentState,
    type CliTestNavigationMode,
    type CliTestRenderMode,
    cliTestsRepoRoot as repoRoot,
    extractModuleScriptSrc,
    resolveDirectLoadFixture,
    resolveOutputScriptPath,
    runMainzCliCommand,
} from "../test-helpers.ts";

const [mode, navigation] = Deno.args as [("csr" | "ssg")?, ("spa" | "mpa" | "enhanced-mpa")?];

if (!mode || !navigation) {
    throw new Error("Usage: deno run -A ./src/cli/tests/helpers/i18n-matrix-check.ts <mode> <navigation>");
}

await runMainzCliCommand(
    [
        "build",
        "--target",
        "site",
        "--mode",
        mode,
        "--navigation",
        navigation,
    ],
    "Failed to build site for i18n matrix check.",
);

await assertRootLocaleRedirect({
    mode,
    navigation,
    navigatorLocale: "pt-BR",
    expectedPathname: "/pt/",
});

await assertRootLocaleRedirect({
    mode,
    navigation,
    navigatorLocale: "es-ES",
    expectedPathname: "/en/",
});

await assertLocalizedRoute({
    mode,
    navigation,
    locale: "en",
    expectedText: "Start guided journey",
    alternateHref: "/pt/",
});

await assertLocalizedRoute({
    mode,
    navigation,
    locale: "pt",
    expectedText: "Iniciar trilha guiada",
    alternateHref: "/en/",
});

async function assertRootLocaleRedirect(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    navigatorLocale: string;
    expectedPathname: string;
}): Promise<void> {
    const outputDir = resolve(repoRoot, `dist/site/${args.mode}`);
    const rootHtmlPath = resolve(outputDir, "index.html");
    const html = await Deno.readTextFile(rootHtmlPath);

    if (args.mode === "csr" && args.navigation === "spa") {
        const scriptSrc = extractModuleScriptSrc(html);
        assert(scriptSrc, "Could not find CSR SPA root module script.");

        const scriptPath = resolveOutputScriptPath({ outputDir, htmlPath: rootHtmlPath, scriptSrc });
        await Deno.stat(scriptPath);

        await withHappyDom(async (window) => {
            overrideGlobalNavigatorLocale(args.navigatorLocale);
            document.write(html);
            document.close();

            await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${args.mode}-${args.navigation}-root`);
            await waitFor(() => window.location.pathname === args.expectedPathname);
        }, { url: "https://mainz.local/" });

        return;
    }

    const redirectScript = extractInlineRedirectScript(html);
    assert(redirectScript, `Could not find locale redirect script for ${args.mode} + ${args.navigation}.`);
    assertStringIncludes(html, '<title>Redirecting...</title>');
    assertStringIncludes(html, '<link rel="canonical"');

    await withHappyDom(async (window) => {
        overrideNavigatorLocale(window.navigator, args.navigatorLocale);
        document.write(html);
        document.close();

        window.eval(redirectScript);
        await nextTick();

        assertEquals(window.location.pathname, args.expectedPathname);
    }, { url: "https://mainz.local/" });
}

async function assertLocalizedRoute(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    locale: "en" | "pt";
    expectedText: string;
    alternateHref: string;
}): Promise<void> {
    const fixture = await resolveLocalizedRouteFixture(args.mode, args.navigation, args.locale);
    const scriptSrc = extractModuleScriptSrc(fixture.html);

    assert(scriptSrc, `Could not find module script src for ${args.mode} + ${args.navigation} (${args.locale}).`);

    const scriptPath = resolveOutputScriptPath({ outputDir: fixture.outputDir, htmlPath: fixture.htmlPath, scriptSrc });
    await Deno.stat(scriptPath);

    await withHappyDom(async () => {
        document.write(fixture.html);
        document.close();

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${args.mode}-${args.navigation}-${args.locale}`);
        await nextTick();

        assertDocumentState({
            navigation: args.navigation,
            locale: args.locale,
            title: "Mainz",
            bodyIncludes: args.expectedText,
        });
        assertEquals(
            document.querySelector<HTMLAnchorElement>(`a[data-locale="${args.locale === "en" ? "pt" : "en"}"]`)?.getAttribute("href"),
            args.alternateHref,
        );
    }, { url: `https://mainz.local/${args.locale}/` });
}

async function resolveLocalizedRouteFixture(
    renderMode: CliTestRenderMode,
    navigationMode: CliTestNavigationMode,
    locale: "en" | "pt",
): Promise<{ html: string; htmlPath: string; outputDir: string }> {
    const outputDir = resolve(repoRoot, `dist/site/${renderMode}`);
    const fixture = await resolveDirectLoadFixture({
        outputDir,
        renderMode,
        navigationMode,
        documentHtmlPath: `${locale}/index.html`,
    });

    return {
        html: fixture.html,
        htmlPath: fixture.htmlPath,
        outputDir: fixture.outputDir,
    };
}

function extractInlineRedirectScript(html: string): string | null {
    const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/i);
    return match?.[1]?.trim() ?? null;
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
