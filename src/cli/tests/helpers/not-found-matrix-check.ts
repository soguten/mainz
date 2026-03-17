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
    runMainzCliCommand,
} from "../test-helpers.ts";

const [mode, navigation] = Deno.args as [("csr" | "ssg")?, ("spa" | "mpa" | "enhanced-mpa")?];

if (!mode || !navigation) {
    throw new Error("Usage: deno run -A ./src/cli/tests/helpers/not-found-matrix-check.ts <mode> <navigation>");
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
    "Failed to build site for 404 matrix check.",
);

await assertNotFoundCase({
    mode,
    navigation,
    url: "https://mainz.local/pgffhgh",
    expectedLocale: "en",
    expectedText: "That route does not exist in Mainz.",
    alternateLocale: "pt",
    expectedAlternateHref: "/pt/pgffhgh/",
});

await assertNotFoundCase({
    mode,
    navigation,
    url: "https://mainz.local/pt/dfdfhsdfsdf",
    expectedLocale: "pt",
    expectedText: "Essa rota nao existe no Mainz.",
    alternateLocale: "en",
    expectedAlternateHref: "/en/dfdfhsdfsdf",
});

async function assertNotFoundCase(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    url: string;
    expectedLocale: "en" | "pt";
    expectedText: string;
    alternateLocale: "en" | "pt";
    expectedAlternateHref: string;
}): Promise<void> {
    const fixture = await resolveNotFoundFixture(args.mode, args.navigation, args.url);
    const scriptSrc = extractModuleScriptSrc(fixture.html);
    assert(scriptSrc, `Could not find module script src for ${args.mode} + ${args.navigation} (${args.url}).`);

    const scriptPath = resolveOutputScriptPath({ outputDir: fixture.outputDir, htmlPath: fixture.htmlPath, scriptSrc });
    await Deno.stat(scriptPath);

    if (fixture.responseStatus !== undefined) {
        assertEquals(fixture.responseStatus, 404);
    }

    await withHappyDom(async () => {
        document.write(fixture.html);
        document.close();

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${args.mode}-${args.navigation}-${args.expectedLocale}`);
        await nextTick();

        assertDocumentState({
            navigation: args.navigation,
            locale: args.expectedLocale,
            title: "404 | Mainz",
            bodyIncludes: args.expectedText,
        });
        assertEquals(
            document.querySelector<HTMLAnchorElement>(`a[data-locale="${args.alternateLocale}"]`)?.getAttribute("href"),
            args.expectedAlternateHref,
        );
    }, { url: args.url });
}

async function resolveNotFoundFixture(
    renderMode: "csr" | "ssg",
    navigationMode: "spa" | "mpa" | "enhanced-mpa",
    url: string,
): Promise<{ html: string; htmlPath: string; outputDir: string; responseStatus?: number }> {
    const outputDir = resolve(repoRoot, `dist/site/${renderMode}`);
    return await resolvePreviewFixture({
        outputDir,
        renderMode,
        navigationMode,
        requestUrl: url.replace("https://mainz.local", "http://127.0.0.1:4173"),
        resolveHtmlPath() {
            return resolve(outputDir, "404.html");
        },
    });
}
