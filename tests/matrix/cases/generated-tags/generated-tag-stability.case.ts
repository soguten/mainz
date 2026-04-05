/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { nextTick } from "../../../../src/testing/async-testing.ts";
import { matrixTest } from "../../harness.ts";

export const generatedTagStabilityCase = matrixTest({
    name: "generated custom element tags stay stable in production output",
    fixture: "GeneratedTagStabilityApp",
    exercise: [
        { render: "ssg", navigation: "enhanced-mpa" },
    ],
    run: async ({ artifact, fixture }) => {
        const html = await fixture.readHtml(artifact, "/");
        assertStringIncludes(html, "<x-stable-name-home-page");
        assertStringIncludes(html, "<x-stable-name-panel");

        const screen = await fixture.renderDocument({
            artifact,
            documentHtmlPath: "index.html",
            url: "https://mainz.local/",
            navigationReady: {
                locale: "en",
                navigationType: "initial",
            },
        });

        try {
            await nextTick();

            assert(document.querySelector("x-stable-name-home-page"));
            assert(document.querySelector("x-stable-name-panel"));
            assertEquals(customElements.get("x-stable-name-home-page") !== undefined, true);
            assertEquals(customElements.get("x-stable-name-panel") !== undefined, true);
            assertStringIncludes(document.body.textContent ?? "", "Generated tag stability");
        } finally {
            screen.cleanup();
        }
    },
});
