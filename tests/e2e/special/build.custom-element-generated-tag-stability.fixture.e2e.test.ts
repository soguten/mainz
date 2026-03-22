/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../../src/ssg/happy-dom.ts";
import { nextTick } from "../../../src/testing/async-testing.ts";
import {
    createCliFixtureTargetConfig,
    extractModuleScriptSrc,
    resolveOutputScriptPath,
    runMainzCliCommand,
} from "../../helpers/test-helpers.ts";

Deno.test("e2e/special generated custom element tags: build should preserve generated page and component names in production output", async () => {
    const fixture = await createCliFixtureTargetConfig({
        fixtureName: "custom-element-generated-tag-stability",
        targetName: "custom-element-generated-tag-stability",
        locales: ["en"],
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
                "--navigation",
                "enhanced-mpa",
            ],
            "Failed to build generated custom element tag stability fixture.",
        );

        const htmlPath = resolve(fixture.outputDir, "ssg", "index.html");
        const html = await Deno.readTextFile(htmlPath);

        assertStringIncludes(html, "<x-stable-name-home-page");
        assertStringIncludes(html, "<x-stable-name-panel");

        const scriptSrc = extractModuleScriptSrc(html);
        assert(
            scriptSrc,
            "Could not find module script src in generated tag stability fixture html.",
        );

        const scriptPath = resolveOutputScriptPath({
            outputDir: resolve(fixture.outputDir, "ssg"),
            scriptSrc,
            htmlPath,
        });

        await withHappyDom(async () => {
            document.write(html);
            document.close();

            await import(
                `${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-generated-tag-stability`
            );
            await nextTick();

            assert(document.querySelector("x-stable-name-home-page"));
            assert(document.querySelector("x-stable-name-panel"));
            assertEquals(customElements.get("x-stable-name-home-page") !== undefined, true);
            assertEquals(customElements.get("x-stable-name-panel") !== undefined, true);
            assertStringIncludes(document.body.textContent ?? "", "Generated tag stability");
        });
    } finally {
        await fixture.cleanup();
    }
});
