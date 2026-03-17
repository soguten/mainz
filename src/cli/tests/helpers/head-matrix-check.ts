/// <reference lib="deno.ns" />

import { assert, assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../../ssg/happy-dom.ts";
import { nextTick } from "../../../testing/async-testing.ts";
import {
    assertSeoState,
    type CliTestNavigationMode,
    type CliTestRenderMode,
    cliTestsRepoRoot as repoRoot,
    extractModuleScriptSrc,
    resolveDirectLoadFixture,
    readAlternateHref,
    resolveOutputScriptPath,
    runMainzCliCommand,
} from "../test-helpers.ts";

const [mode, navigation] = Deno.args as [("csr" | "ssg")?, ("spa" | "mpa" | "enhanced-mpa")?];

if (!mode || !navigation) {
    throw new Error("Usage: deno run -A ./src/cli/tests/helpers/head-matrix-check.ts <mode> <navigation>");
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
    "Failed to build site for head matrix check.",
);

const htmlFixture = await resolveHtmlFixture(mode, navigation);
const scriptSrc = extractModuleScriptSrc(htmlFixture.html);
assert(scriptSrc, `Could not find module script src for ${mode} + ${navigation}.`);

const scriptPath = resolveOutputScriptPath({ outputDir: htmlFixture.outputDir, htmlPath: htmlFixture.htmlPath, scriptSrc });
await Deno.stat(scriptPath);

await withHappyDom(async () => {
    document.write(htmlFixture.html);
    document.close();

    await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${mode}-${navigation}`);
    await nextTick();

    assertEquals(document.head.querySelectorAll('link[rel="canonical"]').length, 1);
    assertEquals(document.head.querySelectorAll('link[rel="alternate"][hreflang]').length, 3);
    assertEquals(document.head.querySelectorAll('link[rel="canonical"][data-mainz-head-managed="true"]').length, 1);
    assertEquals(document.head.querySelectorAll('link[rel="alternate"][hreflang][data-mainz-head-managed="true"]').length, 3);
    assertSeoState({
        canonical: "/pt/",
        alternates: {
            en: "/en/",
            pt: "/pt/",
            "x-default": "/en/",
        },
    });
}, { url: htmlFixture.url });

async function resolveHtmlFixture(
    renderMode: CliTestRenderMode,
    navigationMode: CliTestNavigationMode,
): Promise<{ html: string; htmlPath: string; outputDir: string; url: string }> {
    const outputDir = resolve(repoRoot, `dist/site/${renderMode}`);
    return {
        ...(await resolveDirectLoadFixture({
            outputDir,
            renderMode,
            navigationMode,
            documentHtmlPath: "pt/index.html",
            url: "https://mainz.local/pt/",
        })),
        url: "https://mainz.local/pt/",
    };
}
