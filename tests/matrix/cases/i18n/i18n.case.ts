/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { nextTick } from "../../../../src/testing/async-testing.ts";
import type { MatrixArtifact, MatrixFixture } from "../../harness.ts";
import { matrixTest } from "../../harness.ts";
import { withFixtureDom } from "../../render-fixture.ts";
import {
    extractModuleScriptSrc,
    resolveOutputScriptPath,
} from "../../../helpers/fixture-io.ts";
import { pathToFileURL } from "node:url";

export const i18nCase = matrixTest({
    name: "i18n preserves localized bootstrap and redirects",
    fixture: "RoutedApp",
    exercise: {
        render: ["csr", "ssg"],
        navigation: ["spa", "mpa", "enhanced-mpa"],
    },
    run: async ({ combo, artifact, fixture }) => {
        await assertRootLocaleRedirect({
            combo,
            artifact,
            fixture,
            navigatorLocale: "pt-BR",
            expectedPathname: "/pt/",
        });

        await assertRootLocaleRedirect({
            combo,
            artifact,
            fixture,
            navigatorLocale: "es-ES",
            expectedPathname: "/en/",
        });

        const englishScreen = await fixture.render(artifact, "/en/");
        try {
            assertEquals(document.documentElement.lang, "en");
            assertStringIncludes(document.body.textContent ?? "", "Start guided journey");
            assertEquals(
                document.querySelector<HTMLAnchorElement>('a[data-locale="pt"]')?.getAttribute("href"),
                "/pt/",
            );
        } finally {
            englishScreen.cleanup();
        }

        const portugueseScreen = await fixture.render(artifact, "/pt/");
        try {
            assertEquals(document.documentElement.lang, "pt");
            assertStringIncludes(document.body.textContent ?? "", "Iniciar trilha guiada");
            assertEquals(
                document.querySelector<HTMLAnchorElement>('a[data-locale="en"]')?.getAttribute("href"),
                "/en/",
            );
        } finally {
            portugueseScreen.cleanup();
        }
    },
});

async function assertRootLocaleRedirect(args: {
    combo: { render: "csr" | "ssg"; navigation: "spa" | "mpa" | "enhanced-mpa" };
    artifact: MatrixArtifact;
    fixture: MatrixFixture;
    navigatorLocale: string;
    expectedPathname: string;
}): Promise<void> {
    const html = await args.fixture.readHtml(args.artifact, "/");

    const navigatorProxy = Object.create(navigator);

    Object.defineProperty(navigatorProxy, "language", {
        configurable: true,
        value: args.navigatorLocale,
    });

    Object.defineProperty(navigatorProxy, "languages", {
        configurable: true,
        value: [args.navigatorLocale],
    });

    const previousNavigator = globalThis.navigator;

    await withFixtureDom("https://mainz.local/", async () => {
        Object.defineProperty(globalThis, "navigator", {
            configurable: true,
            writable: true,
            value: navigatorProxy,
        });
        Object.defineProperty(globalThis.window, "navigator", {
            configurable: true,
            value: navigatorProxy,
        });

        try {
            document.write(html);
            document.close();

            if (args.combo.render === "csr" && args.combo.navigation === "spa") {
                const scriptSrc = extractModuleScriptSrc(html);
                assert(scriptSrc, "Could not find CSR SPA root module script.");

                const scriptPath = resolveOutputScriptPath({
                    outputDir: args.artifact.context.outputDir,
                    htmlPath: args.fixture.resolveHtmlPath(args.artifact, "/"),
                    scriptSrc,
                });
                await import(`${pathToFileURL(scriptPath).href}?matrix-root=${Date.now()}`);
                await nextTick();
            } else {
                const redirectScript = extractInlineRedirectScript(html);
                assert(redirectScript, "Could not find locale redirect script in root document.");
                assertStringIncludes(html, "<title>Redirecting...</title>");
                assertStringIncludes(html, '<link rel="canonical"');

                globalThis.window.eval(redirectScript);
                await nextTick();
            }

            assertEquals(globalThis.window.location.pathname, args.expectedPathname);
        } finally {
            Object.defineProperty(globalThis, "navigator", {
                configurable: true,
                writable: true,
                value: previousNavigator,
            });
            Object.defineProperty(globalThis.window, "navigator", {
                configurable: true,
                value: previousNavigator,
            });
        }
    });
}

function extractInlineRedirectScript(html: string): string | null {
    const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/i);
    return match?.[1]?.trim() ?? null;
}
