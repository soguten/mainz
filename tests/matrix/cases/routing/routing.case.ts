/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { type MatrixArtifact, type MatrixFixture, matrixTest } from "../../harness.ts";

export const routingCase = matrixTest({
    name: "routing preserves localized navigation",
    fixture: "RoutedApp",
    exercise: {
        render: ["csr", "ssg"],
        navigation: ["spa", "mpa", "enhanced-mpa"],
    },
    run: async ({ artifact, fixture }) => {
        await assertRoute({
            artifact,
            fixture,
            path: "/",
            expectedStatus: 200,
            expectedLocale: "en",
            expectedTitle: "Mainz",
            expectedText: "Start guided journey",
        });

        await assertRoute({
            artifact,
            fixture,
            path: "/pt/",
            expectedStatus: 200,
            expectedLocale: "pt",
            expectedTitle: "Mainz",
            expectedText: "Iniciar trilha guiada",
        });

        await assertRoute({
            artifact,
            fixture,
            path: "/pt/dfdfhsdfsdf",
            expectedStatus: 404,
            expectedLocale: "pt",
            expectedTitle: "404 | Mainz",
            expectedText: "Essa rota nao existe no Mainz.",
        });
    },
});

async function assertRoute(args: {
    artifact: MatrixArtifact;
    fixture: MatrixFixture;
    path: string;
    expectedStatus: 200 | 404;
    expectedLocale: "en" | "pt";
    expectedTitle: string;
    expectedText: string;
}): Promise<void> {
    const preview = await args.fixture.preview(args.artifact, args.path);
    if (typeof preview.responseStatus === "number") {
        assertEquals(preview.responseStatus, args.expectedStatus);
    }

    const screen = await args.fixture.render(args.artifact, args.path);

    try {
        assertEquals(document.documentElement.lang, args.expectedLocale);
        assertEquals(document.title, args.expectedTitle);
        assertStringIncludes(document.body.textContent ?? "", args.expectedText);
    } finally {
        screen.cleanup();
    }
}
