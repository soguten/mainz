/// <reference lib="deno.ns" />

import { assert, assertEquals, assertNotEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../../ssg/happy-dom.ts";
import { waitFor } from "../../../testing/async-testing.ts";
import {
    type CliTestNavigationMode,
    type CliTestRenderMode,
    cliTestsRepoRoot as repoRoot,
    extractModuleScriptSrc,
    readJsonFile,
    resolveDirectLoadFixture,
    resolveOutputScriptPath,
    runMainzCliCommand,
} from "../test-helpers.ts";

const [mode, navigation] = Deno.args as [("csr" | "ssg")?, ("spa" | "mpa" | "enhanced-mpa")?];

if (!mode || !navigation) {
    throw new Error("Usage: deno run -A ./src/cli/tests/helpers/hydration-matrix-check.ts <mode> <navigation>");
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
    "Failed to build site for hydration matrix check.",
);

const fixture = await resolveHtmlFixture(mode, navigation);
const scriptSrc = extractModuleScriptSrc(fixture.html);
assert(scriptSrc, `Could not find module script src for ${mode} + ${navigation}.`);

const scriptPath = resolveOutputScriptPath({ outputDir: fixture.outputDir, htmlPath: fixture.htmlPath, scriptSrc });
await Deno.stat(scriptPath);

const hydrationManifest = await readHydrationManifest(fixture.outputDir);
if (hydrationManifest) {
    assertEquals(hydrationManifest.navigation, navigation);
}

await withHappyDom(async () => {
    document.write(fixture.html);
    document.close();

    const tutorialTagName = "x-mainz-tutorial-page";
    const initialTutorialRoots = document.querySelectorAll(`#app ${tutorialTagName}`).length;

    if (mode === "ssg") {
        assertEquals(initialTutorialRoots, 1);
        assertStringIncludes(document.body.textContent ?? "", "Iniciar trilha guiada");
    } else {
        assertEquals(initialTutorialRoots, 0);
        assertEquals(document.querySelector("#app")?.innerHTML, "");
    }

    await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${mode}-${navigation}`);
    await waitFor(() => document.querySelectorAll(`#app ${tutorialTagName}`).length === 1);

    assertEquals(document.documentElement.dataset.mainzNavigation, navigation);
    assertEquals(document.documentElement.lang, "pt");
    assertEquals(document.querySelectorAll(`#app ${tutorialTagName}`).length, 1);
    assertStringIncludes(document.body.textContent ?? "", "Iniciar trilha guiada");

    if ((document.body.textContent ?? "").includes("Start guided journey")) {
        throw new Error(`Expected ${mode} + ${navigation} to stay in Portuguese after boot.`);
    }

    const chapterButtons = Array.from(
        document.querySelectorAll<HTMLButtonElement>(".chapter-row .chapter-button"),
    );
    assert(chapterButtons.length >= 2, "Expected at least two chapter buttons after hydration.");

    const activeBefore = document.querySelector(".chapter-row .chapter-button.active")?.textContent?.trim();
    chapterButtons[1].click();
    await waitFor(() => {
        const activeAfterCandidate = document.querySelector(".chapter-row .chapter-button.active")?.textContent?.trim();
        return Boolean(activeBefore && activeAfterCandidate && activeAfterCandidate !== activeBefore);
    });
    const activeAfter = document.querySelector(".chapter-row .chapter-button.active")?.textContent?.trim();

    assert(activeBefore, "Expected an active chapter before interaction.");
    assert(activeAfter, "Expected an active chapter after interaction.");
    assertNotEquals(activeAfter, activeBefore);
}, { url: fixture.url });

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

async function readHydrationManifest(outputDir: string): Promise<{
    target: string;
    hydration: string;
    navigation: "spa" | "mpa" | "enhanced-mpa";
} | null> {
    try {
        return await readJsonFile(resolve(outputDir, "hydration.json")) as {
            target: string;
            hydration: string;
            navigation: "spa" | "mpa" | "enhanced-mpa";
        };
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            return null;
        }

        throw error;
    }
}
