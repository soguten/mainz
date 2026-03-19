/// <reference lib="deno.ns" />

import { assert, assertEquals, assertNotEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../src/ssg/happy-dom.ts";
import { waitFor } from "../../src/testing/async-testing.ts";
import {
    buildCoreContractsForCombination,
    type CliBuildContext,
    extractModuleScriptSrc,
    parseCliMatrixCheckArgs,
    readJsonFile,
    resolveDirectLoadFixture,
    resolveOutputScriptPath,
} from "../helpers/test-helpers.ts";

export async function runHydrationMatrixCheck(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    context?: CliBuildContext;
}): Promise<void> {
    const context = args.context ?? await buildCoreContractsForCombination(args);

    try {
        const fixture = await resolveHtmlFixture(context);
        const scriptSrc = extractModuleScriptSrc(fixture.html);
        assert(
            scriptSrc,
            `Could not find module script src for ${context.mode} + ${context.navigation}.`,
        );

        const scriptPath = resolveOutputScriptPath({
            outputDir: fixture.outputDir,
            htmlPath: fixture.htmlPath,
            scriptSrc,
        });
        await Deno.stat(scriptPath);

        const hydrationManifest = await readHydrationManifest(fixture.outputDir);
        if (hydrationManifest) {
            assertEquals(hydrationManifest.navigation, context.navigation);
        }

        await withHappyDom(async () => {
            document.write(fixture.html);
            document.close();

            const tutorialTagName = "x-mainz-tutorial-page";
            const initialTutorialRoots =
                document.querySelectorAll(`#app ${tutorialTagName}`).length;

            if (context.mode === "ssg") {
                assertEquals(initialTutorialRoots, 1);
                assertStringIncludes(document.body.textContent ?? "", "Iniciar trilha guiada");
            } else {
                assertEquals(initialTutorialRoots, 0);
                assertEquals(document.querySelector("#app")?.innerHTML, "");
            }

            await import(
                `${
                    pathToFileURL(scriptPath).href
                }?e2e=${Date.now()}-${context.mode}-${context.navigation}`
            );
            await waitFor(() => document.querySelectorAll(`#app ${tutorialTagName}`).length === 1);

            assertEquals(document.documentElement.dataset.mainzNavigation, context.navigation);
            assertEquals(document.documentElement.lang, "pt");
            assertEquals(document.querySelectorAll(`#app ${tutorialTagName}`).length, 1);
            assertStringIncludes(document.body.textContent ?? "", "Iniciar trilha guiada");

            if ((document.body.textContent ?? "").includes("Start guided journey")) {
                throw new Error(
                    `Expected ${context.mode} + ${context.navigation} to stay in Portuguese after boot.`,
                );
            }

            const chapterButtons = Array.from(
                document.querySelectorAll<HTMLButtonElement>(".chapter-row .chapter-button"),
            );
            assert(
                chapterButtons.length >= 2,
                "Expected at least two chapter buttons after hydration.",
            );

            const activeBefore = document.querySelector(".chapter-row .chapter-button.active")
                ?.textContent?.trim();
            chapterButtons[1].click();
            await waitFor(() => {
                const activeAfterCandidate = document.querySelector(
                    ".chapter-row .chapter-button.active",
                )?.textContent
                    ?.trim();
                return Boolean(
                    activeBefore && activeAfterCandidate && activeAfterCandidate !== activeBefore,
                );
            });
            const activeAfter = document.querySelector(".chapter-row .chapter-button.active")
                ?.textContent?.trim();

            assert(activeBefore, "Expected an active chapter before interaction.");
            assert(activeAfter, "Expected an active chapter after interaction.");
            assertNotEquals(activeAfter, activeBefore);
        }, { url: fixture.url });
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

async function readHydrationManifest(outputDir: string): Promise<
    {
        target: string;
        hydration: string;
        navigation: "spa" | "mpa" | "enhanced-mpa";
    } | null
> {
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

if (import.meta.main) {
    const args = parseCliMatrixCheckArgs("hydration-matrix-check.ts", Deno.args);
    await runHydrationMatrixCheck(args);
}
