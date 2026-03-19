/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../../src/ssg/happy-dom.ts";
import { nextTick } from "../../../src/testing/async-testing.ts";
import {
    cliTestsRepoRoot as repoRoot,
    extractModuleScriptSrc,
    resolveOutputScriptPath,
    runMainzCliCommand,
} from "../../helpers/test-helpers.ts";

Deno.test("e2e/csr spa: build should emit a direct-load shell that works for localized routes and notFound routes", async () => {
    await buildSiteCsrSpa();

    const rootHtmlPath = resolve(repoRoot, "dist/site/csr/index.html");
    const html = await Deno.readTextFile(rootHtmlPath);
    const scriptSrc = extractModuleScriptSrc(html);

    assert(scriptSrc, "Could not find module script src in CSR SPA html.");
    assertStringIncludes(scriptSrc, "/assets/");

    const scriptPath = resolveOutputScriptPath({
        outputDir: resolve(repoRoot, "dist/site/csr"),
        scriptSrc,
    });
    await Deno.stat(scriptPath);

    await withHappyDom(async () => {
        document.write(html);
        document.close();
        overrideNavigatorLocale("pt-BR");

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-csr-spa-root-pt`);
        await nextTick();

        assertEquals(window.location.pathname, "/pt/");
        assertEquals(document.documentElement.lang, "pt");
        assertStringIncludes(document.body.textContent ?? "", "Iniciar trilha guiada");
    }, { url: "https://mainz.local/" });

    await withHappyDom(async () => {
        document.write(html);
        document.close();

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-csr-spa-pt`);
        await nextTick();

        assertEquals(document.documentElement.dataset.mainzNavigation, "spa");
        assertEquals(document.documentElement.lang, "pt");
        assertEquals(
            document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"),
            "/pt/",
        );
        assertEquals(readAlternateHref("en"), "/en/");
        assertEquals(readAlternateHref("pt"), "/pt/");
        assertEquals(readAlternateHref("x-default"), "/en/");
        assertStringIncludes(document.body.textContent ?? "", "Iniciar trilha guiada");
    }, { url: "https://mainz.local/pt/" });

    await withHappyDom(async () => {
        document.write(html);
        document.close();

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-csr-spa-404`);
        await nextTick();

        assertEquals(document.documentElement.dataset.mainzNavigation, "spa");
        assertStringIncludes(
            document.body.textContent ?? "",
            "That route does not exist in Mainz.",
        );
    }, { url: "https://mainz.local/enadasd" });
});

Deno.test("e2e/csr spa: task contract should preview csr spa with explicit spa navigation env", async () => {
    const denoJson = JSON.parse(await Deno.readTextFile(resolve(repoRoot, "deno.json"))) as {
        tasks?: Record<string, string>;
    };

    const previewCsrTask = denoJson.tasks?.["preview:site:csr"];
    const previewCsrSpaTask = denoJson.tasks?.["preview:site:csr:spa"];

    assert(previewCsrTask, 'Expected deno task "preview:site:csr" to exist.');
    assert(previewCsrSpaTask, 'Expected deno task "preview:site:csr:spa" to exist.');
    assertStringIncludes(previewCsrTask, "MAINZ_NAVIGATION_MODE=spa");
    assertStringIncludes(previewCsrSpaTask, "MAINZ_NAVIGATION_MODE=spa");
});

async function buildSiteCsrSpa(): Promise<void> {
    await runMainzCliCommand(
        ["build", "--target", "site", "--mode", "csr", "--navigation", "spa"],
        "Failed to build site for CSR SPA e2e test.",
    );
}

function overrideNavigatorLocale(locale: string): void {
    Object.defineProperty(navigator, "language", {
        configurable: true,
        value: locale,
    });

    Object.defineProperty(navigator, "languages", {
        configurable: true,
        value: [locale],
    });
}

function readAlternateHref(hreflang: string): string | null {
    return document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)
        ?.getAttribute("href") ?? null;
}
