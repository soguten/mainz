/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { nextTick } from "../../../../src/testing/async-testing.ts";
import { matrixTest } from "../../harness.ts";

export const navigationOverrideCase = matrixTest({
    name: "profile navigation override forces plain MPA runtime",
    fixture: "NavigationOverrideApp",
    profile: "plain-static",
    exercise: [
        { render: "ssg", navigation: "mpa" },
    ],
    run: async ({ artifact, fixture }) => {
        const hydrationManifest = await fixture.readJson<{
            target: string;
            hydration: string;
            navigation: string;
        }>(artifact, "hydration.json");

        assertEquals(hydrationManifest.navigation, "mpa");

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

            assertEquals(document.documentElement.dataset.mainzNavigation, "mpa");
            assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);
            assertEquals(document.documentElement.dataset.mainzViewTransitions, undefined);
        } finally {
            screen.cleanup();
        }
    },
});
