/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../src/ssg/happy-dom.ts";
import { nextTick, waitFor } from "../../src/testing/async-testing.ts";
import {
    assertDocumentState,
    buildCoreContractsForCombination,
    type CliBuildContext,
    extractModuleScriptSrc,
    parseCliMatrixCheckArgs,
    resolveDirectLoadFixture,
    resolveOutputScriptPath,
    waitForNextNavigationReady,
} from "../helpers/test-helpers.ts";

export async function runI18nMatrixCheck(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    context?: CliBuildContext;
}): Promise<void> {
    const context = args.context ?? await buildCoreContractsForCombination(args);

    try {
        await assertRootLocaleRedirect({
            context,
            navigatorLocale: "pt-BR",
            expectedPathname: "/pt/",
        });

        await assertRootLocaleRedirect({
            context,
            navigatorLocale: "es-ES",
            expectedPathname: "/en/",
        });

        await assertLocalizedRoute({
            context,
            locale: "en",
            expectedText: "Start guided journey",
            alternateHref: "/pt/",
        });

        await assertLocalizedRoute({
            context,
            locale: "pt",
            expectedText: "Iniciar trilha guiada",
            alternateHref: "/en/",
        });
    } finally {
        if (!args.context) {
            await context.cleanup?.();
        }
    }
}

async function assertRootLocaleRedirect(args: {
    context: CliBuildContext;
    navigatorLocale: string;
    expectedPathname: string;
}): Promise<void> {
    const outputDir = args.context.outputDir;
    const rootHtmlPath = resolve(outputDir, "index.html");
    const html = await Deno.readTextFile(rootHtmlPath);

    if (args.context.mode === "csr" && args.context.navigation === "spa") {
        const scriptSrc = extractModuleScriptSrc(html);
        assert(scriptSrc, "Could not find CSR SPA root module script.");

        const scriptPath = resolveOutputScriptPath({
            outputDir,
            htmlPath: rootHtmlPath,
            scriptSrc,
        });
        await Deno.stat(scriptPath);

        await withHappyDom(async (window) => {
            overrideGlobalNavigatorLocale(args.navigatorLocale);
            document.write(html);
            document.close();

            await import(
                `${
                    pathToFileURL(scriptPath).href
                }?e2e=${Date.now()}-${args.context.mode}-${args.context.navigation}-root`
            );
            await waitFor(() => window.location.pathname === args.expectedPathname);
        }, { url: "https://mainz.local/" });

        return;
    }

    const redirectScript = extractInlineRedirectScript(html);
    assert(
        redirectScript,
        `Could not find locale redirect script for ${args.context.mode} + ${args.context.navigation}.`,
    );
    assertStringIncludes(html, "<title>Redirecting...</title>");
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
    context: CliBuildContext;
    locale: "en" | "pt";
    expectedText: string;
    alternateHref: string;
}): Promise<void> {
    const fixture = await resolveLocalizedRouteFixture(args.context, args.locale);
    const scriptSrc = extractModuleScriptSrc(fixture.html);

    assert(
        scriptSrc,
        `Could not find module script src for ${args.context.mode} + ${args.context.navigation} (${args.locale}).`,
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
            mode: args.context.navigation,
            locale: args.locale,
            navigationType: "initial",
        });
        await import(
            `${
                pathToFileURL(scriptPath).href
            }?e2e=${Date.now()}-${args.context.mode}-${args.context.navigation}-${args.locale}`
        );
        await navigationReady;

        assertDocumentState({
            navigation: args.context.navigation,
            locale: args.locale,
            title: "Mainz",
            bodyIncludes: args.expectedText,
        });
        assertEquals(
            document.querySelector<HTMLAnchorElement>(
                `a[data-locale="${args.locale === "en" ? "pt" : "en"}"]`,
            )?.getAttribute("href"),
            args.alternateHref,
        );
    }, { url: `https://mainz.local/${args.locale}/` });
}

async function resolveLocalizedRouteFixture(
    context: CliBuildContext,
    locale: "en" | "pt",
): Promise<{ html: string; htmlPath: string; outputDir: string }> {
    const outputDir = context.outputDir;
    const fixture = await resolveDirectLoadFixture({
        outputDir,
        renderMode: context.mode,
        navigationMode: context.navigation,
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

if (import.meta.main) {
    const args = parseCliMatrixCheckArgs("i18n-matrix-check.ts", Deno.args);
    await runI18nMatrixCheck(args);
}
