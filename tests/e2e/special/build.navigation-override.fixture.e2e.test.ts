/// <reference lib="deno.ns" />

import { assert, assertEquals } from "@std/assert";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../../src/ssg/happy-dom.ts";
import { nextTick } from "../../../src/testing/async-testing.ts";
import {
    createBuildContext,
    createCliFixtureTargetConfig,
    extractModuleScriptSrc,
    readJsonFile,
    runMainzCliCommand,
} from "../../helpers/test-helpers.ts";

Deno.test(
    "e2e/fixture navigation override: configured navigation override should force MPA runtime without enhanced hooks",
    async () => {
        const fixture = await createCliFixtureTargetConfig({
            fixtureName: "navigation-override",
            targetName: "fixture-navigation-override",
            locales: ["en"],
            defaultLocale: "en",
        });

        try {
            await runMainzCliCommand(
                [
                    "build",
                    "--config",
                    fixture.configPath,
                    "--target",
                    fixture.targetName,
                    "--mode",
                    "ssg",
                    "--profile",
                    "plain-static",
                ],
                `Failed to build ${fixture.targetName} with profile navigation override.`,
            );
            const context = createBuildContext({
                fixtureName: fixture.targetName,
                fixtureRoot: fixture.fixtureRoot,
                outputDir: resolve(fixture.outputDir, "ssg"),
                targetName: fixture.targetName,
                mode: "ssg",
                navigation: "mpa",
                profile: "plain-static",
                configPath: fixture.configPath,
            });

            const hydrationManifest = await readJsonFile<{
                target: string;
                hydration: string;
                navigation: string;
            }>(resolve(context.outputDir, "hydration.json"));
            assertEquals(hydrationManifest.navigation, "mpa");

            const routeHtmlPath = resolve(context.outputDir, "index.html");
            const html = await Deno.readTextFile(routeHtmlPath);
            const scriptSrc = extractModuleScriptSrc(html);
            assert(
                scriptSrc,
                "Could not find module script src in prerendered navigation-override fixture html.",
            );

            const scriptPath = resolve(dirname(routeHtmlPath), scriptSrc);
            await Deno.stat(scriptPath);

            await withHappyDom(async () => {
                document.write(html);
                document.close();

                await import(
                    `${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-navigation-override`
                );
                await nextTick();

                assertEquals(document.documentElement.dataset.mainzNavigation, "mpa");
                assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);
                assertEquals(document.documentElement.dataset.mainzViewTransitions, undefined);
            }, { url: "https://mainz.local/" });
        } finally {
            await fixture.cleanup();
        }
    },
);
