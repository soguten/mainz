/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../../ssg/happy-dom.ts";
import { nextTick } from "../../../testing/async-testing.ts";
import {
    assertDocumentState,
    cliTestsRepoRoot as repoRoot,
    extractModuleScriptSrc,
    resolvePreviewFixture,
    resolveOutputScriptPath,
    resolveOutputHtmlPath,
    runMainzCliCommand,
} from "../test-helpers.ts";

const [mode, navigation] = Deno.args as [("csr" | "ssg")?, ("spa" | "mpa" | "enhanced-mpa")?];

if (!mode || !navigation) {
    throw new Error("Usage: deno run -A ./src/cli/tests/helpers/routing-matrix-check.ts <mode> <navigation>");
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
    "Failed to build site for routing matrix check.",
);

await assertRoute({
    mode,
    navigation,
    path: "/en/",
    expectedStatus: 200,
    expectedLocale: "en",
    expectedTitle: "Mainz",
    expectedText: "Start guided journey",
});

await assertRoute({
    mode,
    navigation,
    path: "/pt/",
    expectedStatus: 200,
    expectedLocale: "pt",
    expectedTitle: "Mainz",
    expectedText: "Iniciar trilha guiada",
});

await assertRoute({
    mode,
    navigation,
    path: "/pt/dfdfhsdfsdf",
    expectedStatus: 404,
    expectedLocale: "pt",
    expectedTitle: "404 | Mainz",
    expectedText: "Essa rota nao existe no Mainz.",
});

async function assertRoute(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    path: string;
    expectedStatus: 200 | 404;
    expectedLocale: "en" | "pt";
    expectedTitle: string;
    expectedText: string;
}): Promise<void> {
    const fixture = await resolveRouteFixture(args.mode, args.navigation, args.path);
    const scriptSrc = extractModuleScriptSrc(fixture.html);
    assert(scriptSrc, `Could not find module script src for ${args.mode} + ${args.navigation} (${args.path}).`);

    const scriptPath = resolveOutputScriptPath({ outputDir: fixture.outputDir, htmlPath: fixture.htmlPath, scriptSrc });
    await Deno.stat(scriptPath);

    if (fixture.responseStatus !== undefined) {
        assertEquals(fixture.responseStatus, args.expectedStatus);
    }

    await withHappyDom(async () => {
        document.write(fixture.html);
        document.close();

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${args.mode}-${args.navigation}-${encodeURIComponent(args.path)}`);
        await nextTick();

        assertDocumentState({
            navigation: args.navigation,
            locale: args.expectedLocale,
            title: args.expectedTitle,
            bodyIncludes: args.expectedText,
        });
    }, { url: `https://mainz.local${args.path}` });
}

async function resolveRouteFixture(
    renderMode: "csr" | "ssg",
    navigationMode: "spa" | "mpa" | "enhanced-mpa",
    routePath: string,
): Promise<{ html: string; htmlPath: string; outputDir: string; responseStatus?: number }> {
    const outputDir = resolve(repoRoot, `dist/site/${renderMode}`);
    return await resolvePreviewFixture({
        outputDir,
        renderMode,
        navigationMode,
        requestUrl: `http://127.0.0.1:4173${routePath}`,
        resolveHtmlPath(responseStatus) {
            return responseStatus === 404
                ? resolve(outputDir, "404.html")
                : resolveOutputHtmlPath(outputDir, routePath);
        },
    });
}
