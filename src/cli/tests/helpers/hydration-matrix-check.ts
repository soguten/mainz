/// <reference lib="deno.ns" />

import { assert, assertEquals, assertNotEquals, assertStringIncludes } from "@std/assert";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withHappyDom } from "../../../ssg/happy-dom.ts";

const decoder = new TextDecoder();
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const [mode, navigation] = Deno.args as [("csr" | "ssg")?, ("spa" | "mpa" | "enhanced-mpa")?];

if (!mode || !navigation) {
    throw new Error("Usage: deno run -A ./src/cli/tests/helpers/hydration-matrix-check.ts <mode> <navigation>");
}

await runBuildCommand([
    "build",
    "--target",
    "site",
    "--mode",
    mode,
    "--navigation",
    navigation,
]);

const fixture = await resolveHtmlFixture(mode, navigation);
const scriptSrc = extractModuleScriptSrc(fixture.html);
assert(scriptSrc, `Could not find module script src for ${mode} + ${navigation}.`);

const scriptPath = resolveOutputScriptPath(fixture.outputDir, fixture.htmlPath, scriptSrc);
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
    renderMode: "csr" | "ssg",
    navigationMode: "spa" | "mpa" | "enhanced-mpa",
): Promise<{ html: string; htmlPath: string; outputDir: string; url: string }> {
    const outputDir = resolve(repoRoot, `dist/site/${renderMode}`);

    if (renderMode === "csr" && navigationMode === "spa") {
        const htmlPath = resolve(outputDir, "index.html");
        return {
            html: await Deno.readTextFile(htmlPath),
            htmlPath,
            outputDir,
            url: "https://mainz.local/pt/",
        };
    }

    const htmlPath = resolve(outputDir, "pt", "index.html");
    return {
        html: await Deno.readTextFile(htmlPath),
        htmlPath,
        outputDir,
        url: "https://mainz.local/pt/",
    };
}

async function runBuildCommand(args: string[]): Promise<void> {
    const command = new Deno.Command("deno", {
        args: [
            "run",
            "-A",
            "./src/cli/mainz.ts",
            ...args,
        ],
        cwd: repoRoot,
        stdout: "piped",
        stderr: "piped",
    });

    const result = await command.output();
    if (result.success) {
        return;
    }

    const stdout = decoder.decode(result.stdout);
    const stderr = decoder.decode(result.stderr);
    throw new Error(`Failed to build site for hydration matrix check.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
}

function extractModuleScriptSrc(html: string): string | null {
    const match = html.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/i);
    return match?.[1] ?? null;
}

function resolveOutputScriptPath(outputDir: string, htmlPath: string, scriptSrc: string): string {
    if (scriptSrc.startsWith("/")) {
        return resolve(outputDir, `.${scriptSrc}`);
    }

    return resolve(dirname(htmlPath), scriptSrc);
}

async function nextTick(): Promise<void> {
    await Promise.resolve();
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
}

async function waitFor(predicate: () => boolean, message = "Expected condition to become true."): Promise<void> {
    for (let attempt = 0; attempt < 25; attempt += 1) {
        if (predicate()) {
            return;
        }

        await nextTick();
    }

    throw new Error(message);
}

async function readHydrationManifest(outputDir: string): Promise<{
    target: string;
    hydration: string;
    navigation: "spa" | "mpa" | "enhanced-mpa";
} | null> {
    try {
        return JSON.parse(await Deno.readTextFile(resolve(outputDir, "hydration.json"))) as {
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
