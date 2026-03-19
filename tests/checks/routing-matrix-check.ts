/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../src/ssg/happy-dom.ts";
import { nextTick } from "../../src/testing/async-testing.ts";
import {
    assertDocumentState,
    buildCoreContractsForCombination,
    type CliBuildContext,
    cliTestsRepoRoot as repoRoot,
    extractModuleScriptSrc,
    parseCliMatrixCheckArgs,
    resolveOutputHtmlPath,
    resolveOutputScriptPath,
    resolvePreviewFixture,
} from "../helpers/test-helpers.ts";

export async function runRoutingMatrixCheck(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    context?: CliBuildContext;
}): Promise<void> {
    const context = args.context ?? await buildCoreContractsForCombination(args);

    try {
        await assertRoute({
            context,
            path: "/en/",
            expectedStatus: 200,
            expectedLocale: "en",
            expectedTitle: "Mainz",
            expectedText: "Start guided journey",
        });

        await assertRoute({
            context,
            path: "/pt/",
            expectedStatus: 200,
            expectedLocale: "pt",
            expectedTitle: "Mainz",
            expectedText: "Iniciar trilha guiada",
        });

        await assertRoute({
            context,
            path: "/pt/dfdfhsdfsdf",
            expectedStatus: 404,
            expectedLocale: "pt",
            expectedTitle: "404 | Mainz",
            expectedText: "Essa rota nao existe no Mainz.",
        });
    } finally {
        if (!args.context) {
            await context.cleanup?.();
        }
    }
}

async function assertRoute(args: {
    context: CliBuildContext;
    path: string;
    expectedStatus: 200 | 404;
    expectedLocale: "en" | "pt";
    expectedTitle: string;
    expectedText: string;
}): Promise<void> {
    const fixture = await resolveRouteFixture(args.context, args.path);
    const scriptSrc = extractModuleScriptSrc(fixture.html);
    assert(
        scriptSrc,
        `Could not find module script src for ${args.context.mode} + ${args.context.navigation} (${args.path}).`,
    );

    const scriptPath = resolveOutputScriptPath({
        outputDir: fixture.outputDir,
        htmlPath: fixture.htmlPath,
        scriptSrc,
    });
    await Deno.stat(scriptPath);

    if (fixture.responseStatus !== undefined) {
        assertEquals(fixture.responseStatus, args.expectedStatus);
    }

    await withHappyDom(async () => {
        document.write(fixture.html);
        document.close();

        await import(
            `${
                pathToFileURL(scriptPath).href
            }?e2e=${Date.now()}-${args.context.mode}-${args.context.navigation}-${
                encodeURIComponent(args.path)
            }`
        );
        await nextTick();

        assertDocumentState({
            navigation: args.context.navigation,
            locale: args.expectedLocale,
            title: args.expectedTitle,
            bodyIncludes: args.expectedText,
        });
    }, { url: `https://mainz.local${args.path}` });
}

async function resolveRouteFixture(
    context: CliBuildContext,
    routePath: string,
): Promise<{ html: string; htmlPath: string; outputDir: string; responseStatus?: number }> {
    const outputDir = context.outputDir ?? resolve(repoRoot, `dist/site/${context.mode}`);
    return await resolvePreviewFixture({
        outputDir,
        renderMode: context.mode,
        navigationMode: context.navigation,
        requestUrl: `http://127.0.0.1:4173${routePath}`,
        resolveHtmlPath(responseStatus) {
            return responseStatus === 404
                ? resolve(outputDir, "404.html")
                : resolveOutputHtmlPath(outputDir, routePath);
        },
    });
}

if (import.meta.main) {
    const args = parseCliMatrixCheckArgs("routing-matrix-check.ts", Deno.args);
    await runRoutingMatrixCheck(args);
}
