/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { type MatrixArtifact, type MatrixFixture, matrixTest } from "../../harness.ts";

export const notFoundCase = matrixTest({
    name: "notFound preserves localized 404 behavior",
    fixture: "RoutedApp",
    exercise: {
        render: ["csr", "ssg"],
        navigation: ["spa", "mpa", "enhanced-mpa"],
    },
    run: async ({ artifact, fixture }) => {
        await assertNotFoundCase({
            artifact,
            fixture,
            routePath: "/pgffhgh",
            expectedLocale: "en",
            expectedText: "That route does not exist in Mainz.",
            alternateLocale: "pt",
            expectedAlternateHref: "/pt/pgffhgh/",
        });

        await assertNotFoundCase({
            artifact,
            fixture,
            routePath: "/pt/dfdfhsdfsdf",
            expectedLocale: "pt",
            expectedText: "Essa rota nao existe no Mainz.",
            alternateLocale: "en",
            expectedAlternateHref: "/dfdfhsdfsdf",
        });
    },
});

async function assertNotFoundCase(args: {
    artifact: MatrixArtifact;
    fixture: MatrixFixture;
    routePath: string;
    expectedLocale: "en" | "pt";
    expectedText: string;
    alternateLocale: "en" | "pt";
    expectedAlternateHref: string;
}): Promise<void> {
    const preview = await args.fixture.preview(args.artifact, args.routePath);
    if (typeof preview.responseStatus === "number") {
        assertEquals(preview.responseStatus, 404);
    }

    const screen = await args.fixture.render(args.artifact, args.routePath);
    try {
        assertEquals(document.documentElement.lang, args.expectedLocale);
        assertEquals(document.title, "404 | Mainz");
        assertStringIncludes(document.body.textContent ?? "", args.expectedText);
        assertEquals(
            document.querySelector<HTMLAnchorElement>(`a[data-locale="${args.alternateLocale}"]`)
                ?.getAttribute("href"),
            args.expectedAlternateHref,
        );
    } finally {
        screen.cleanup();
    }
}
