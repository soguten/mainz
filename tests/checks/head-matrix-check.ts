/// <reference lib="deno.ns" />

import { assert, assertEquals } from "@std/assert";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../src/ssg/happy-dom.ts";
import { nextTick } from "../../src/testing/async-testing.ts";
import {
    assertSeoState,
    buildCoreContractsForCombination,
    type CliBuildContext,
    extractModuleScriptSrc,
    parseCliMatrixCheckArgs,
    resolveDirectLoadFixture,
    resolveOutputScriptPath,
} from "../helpers/test-helpers.ts";

export async function runHeadMatrixCheck(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    context?: CliBuildContext;
}): Promise<void> {
    const context = args.context ?? await buildCoreContractsForCombination(args);

    try {
        const htmlFixture = await resolveHtmlFixture(context);
        const scriptSrc = extractModuleScriptSrc(htmlFixture.html);
        assert(
            scriptSrc,
            `Could not find module script src for ${context.mode} + ${context.navigation}.`,
        );

        const scriptPath = resolveOutputScriptPath({
            outputDir: htmlFixture.outputDir,
            htmlPath: htmlFixture.htmlPath,
            scriptSrc,
        });
        await Deno.stat(scriptPath);

        await withHappyDom(async () => {
            document.write(htmlFixture.html);
            document.close();

            await import(
                `${
                    pathToFileURL(scriptPath).href
                }?e2e=${Date.now()}-${context.mode}-${context.navigation}`
            );
            await nextTick();

            assertEquals(document.head.querySelectorAll('link[rel="canonical"]').length, 1);
            assertEquals(
                document.head.querySelectorAll('link[rel="alternate"][hreflang]').length,
                3,
            );
            assertEquals(
                document.head.querySelectorAll(
                    'link[rel="canonical"][data-mainz-head-managed="true"]',
                )
                    .length,
                1,
            );
            assertEquals(
                document.head.querySelectorAll(
                    'link[rel="alternate"][hreflang][data-mainz-head-managed="true"]',
                ).length,
                3,
            );
            assertSeoState({
                canonical: "/pt/",
                alternates: {
                    en: "/en/",
                    pt: "/pt/",
                    "x-default": "/en/",
                },
            });
        }, { url: htmlFixture.url });
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
            documentHtmlPath: "pt/index.html",
            url: "https://mainz.local/pt/",
        })),
        url: "https://mainz.local/pt/",
    };
}

if (import.meta.main) {
    const args = parseCliMatrixCheckArgs("head-matrix-check.ts", Deno.args);
    await runHeadMatrixCheck(args);
}
