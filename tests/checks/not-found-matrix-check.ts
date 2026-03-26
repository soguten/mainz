/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../src/ssg/happy-dom.ts";
import {
    assertDocumentState,
    buildCoreContractsForCombination,
    type CliBuildContext,
    cliTestsRepoRoot as repoRoot,
    extractModuleScriptSrc,
    parseCliMatrixCheckArgs,
    resolveOutputScriptPath,
    resolvePreviewFixture,
    waitForNextNavigationReady,
} from "../helpers/test-helpers.ts";

export async function runNotFoundMatrixCheck(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    context?: CliBuildContext;
}): Promise<void> {
    const context = args.context ?? await buildCoreContractsForCombination(args);

    try {
        await assertNotFoundCase({
            context,
            url: "https://mainz.local/pgffhgh",
            expectedLocale: "en",
            expectedText: "That route does not exist in Mainz.",
            alternateLocale: "pt",
            expectedAlternateHref: "/pt/pgffhgh/",
        });

        await assertNotFoundCase({
            context,
            url: "https://mainz.local/pt/dfdfhsdfsdf",
            expectedLocale: "pt",
            expectedText: "Essa rota nao existe no Mainz.",
            alternateLocale: "en",
            expectedAlternateHref: "/en/dfdfhsdfsdf",
        });
    } finally {
        if (!args.context) {
            await context.cleanup?.();
        }
    }
}

async function assertNotFoundCase(args: {
    context: CliBuildContext;
    url: string;
    expectedLocale: "en" | "pt";
    expectedText: string;
    alternateLocale: "en" | "pt";
    expectedAlternateHref: string;
}): Promise<void> {
    const fixture = await resolveNotFoundFixture(args.context, args.url);
    const scriptSrc = extractModuleScriptSrc(fixture.html);
    assert(
        scriptSrc,
        `Could not find module script src for ${args.context.mode} + ${args.context.navigation} (${args.url}).`,
    );

    const scriptPath = resolveOutputScriptPath({
        outputDir: fixture.outputDir,
        htmlPath: fixture.htmlPath,
        scriptSrc,
    });
    await Deno.stat(scriptPath);

    if (fixture.responseStatus !== undefined) {
        assertEquals(fixture.responseStatus, 404);
    }

    await withHappyDom(async () => {
        document.write(fixture.html);
        document.close();

        const navigationReady = waitForNextNavigationReady({
            mode: args.context.navigation,
            locale: args.expectedLocale,
            navigationType: "initial",
        });
        await import(
            `${
                pathToFileURL(scriptPath).href
            }?e2e=${Date.now()}-${args.context.mode}-${args.context.navigation}-${args.expectedLocale}`
        );
        await navigationReady;

        assertDocumentState({
            navigation: args.context.navigation,
            locale: args.expectedLocale,
            title: "404 | Mainz",
            bodyIncludes: args.expectedText,
        });
        assertEquals(
            document.querySelector<HTMLAnchorElement>(`a[data-locale="${args.alternateLocale}"]`)
                ?.getAttribute("href"),
            args.expectedAlternateHref,
        );
    }, { url: args.url });
}

async function resolveNotFoundFixture(
    context: CliBuildContext,
    url: string,
): Promise<{ html: string; htmlPath: string; outputDir: string; responseStatus?: number }> {
    const outputDir = context.outputDir;
    return await resolvePreviewFixture({
        outputDir,
        renderMode: context.mode,
        navigationMode: context.navigation,
        requestUrl: url.replace("https://mainz.local", "http://127.0.0.1:4173"),
        resolveHtmlPath() {
            return resolve(outputDir, "404.html");
        },
    });
}

if (import.meta.main) {
    const args = parseCliMatrixCheckArgs("not-found-matrix-check.ts", Deno.args);
    await runNotFoundMatrixCheck(args);
}
