/// <reference lib="deno.ns" />

import { assert, assertEquals, assertNotEquals, assertStringIncludes } from "@std/assert";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createSsgPreviewHandler } from "../../preview/ssg-server.ts";
import { withHappyDom } from "../../ssg/happy-dom.ts";
import { nextTick } from "../../testing/async-testing.ts";
import {
    cliTestsRepoRoot as repoRoot,
    extractModuleScriptSrc,
    readJsonFile,
    resolveOutputScriptPath,
    runMainzCliCommand,
} from "./test-helpers.ts";

Deno.test("e2e/ssg hydration: prerendered site should hydrate and keep click interactivity", async () => {
    await buildSiteSsg();

    const hydrationManifest = await readHydrationManifest();
    assertEquals(hydrationManifest.navigation, "enhanced-mpa");

    const rootHtmlPath = resolve(repoRoot, "dist/site/ssg/index.html");
    const rootHtml = await Deno.readTextFile(rootHtmlPath);
    assertStringIncludes(rootHtml, 'http-equiv="refresh"');
    assertStringIncludes(rootHtml, "url=/en/");

    const routeHtmlPath = resolve(repoRoot, "dist/site/ssg/en/index.html");
    const html = await Deno.readTextFile(routeHtmlPath);

    assertStringIncludes(html, "<x-mainz-tutorial-page>");
    assertStringIncludes(html, "Start guided journey");
    assertStringIncludes(html, "Guided journey");

    const scriptSrc = extractModuleScriptSrc(html);
    assert(scriptSrc, "Could not find module script src in prerendered html.");
    assertStringIncludes(scriptSrc, "../assets/");

    const scriptPath = resolve(dirname(routeHtmlPath), scriptSrc);
    await Deno.stat(scriptPath);

    const ptRouteHtmlPath = resolve(repoRoot, "dist/site/ssg/pt/index.html");
    const ptHtml = await Deno.readTextFile(ptRouteHtmlPath);
    assertStringIncludes(ptHtml, "Iniciar trilha guiada");
    assertStringIncludes(ptHtml, "Trilha guiada");
    if (ptHtml.includes("Start guided journey")) {
        throw new Error("Expected /pt/ content to remain in Portuguese, but found English hero CTA.");
    }
    const ptScriptSrc = extractModuleScriptSrc(ptHtml);
    assert(ptScriptSrc, "Could not find module script src in prerendered /pt/ html.");
    const ptScriptPath = resolve(dirname(ptRouteHtmlPath), ptScriptSrc);
    await Deno.stat(ptScriptPath);

    await withHappyDom(async () => {
        document.write(html);
        document.close();

        assert(
            document.querySelector("#app x-mainz-tutorial-page"),
            "Expected prerendered tutorial root in #app.",
        );

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}`);
        await nextTick();

        assertEquals(document.documentElement.dataset.mainzNavigation, "enhanced-mpa");
        assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);
        assert(document.documentElement.dataset.mainzViewTransitions);

        const chapterButtons = Array.from(
            document.querySelectorAll<HTMLButtonElement>(".chapter-row .chapter-button"),
        );
        assert(chapterButtons.length >= 2, "Expected at least two chapter buttons.");

        const activeBefore = document.querySelector(".chapter-row .chapter-button.active")
            ?.textContent?.trim();
        chapterButtons[1].click();
        await nextTick();
        const activeAfter = document.querySelector(".chapter-row .chapter-button.active")
            ?.textContent?.trim();

        assert(activeBefore, "Expected an active chapter before click.");
        assert(activeAfter, "Expected an active chapter after click.");
        assertNotEquals(activeAfter, activeBefore);
    });

    await withHappyDom(async () => {
        document.write(ptHtml);
        document.close();

        assertStringIncludes(document.body.textContent ?? "", "Iniciar trilha guiada");

        await import(`${pathToFileURL(ptScriptPath).href}?e2e=${Date.now()}-pt`);
        await nextTick();

        const hydratedText = document.body.textContent ?? "";
        assertStringIncludes(hydratedText, "Iniciar trilha guiada");

        if (hydratedText.includes("Start guided journey")) {
            throw new Error("Hydration switched /pt/ content to English unexpectedly.");
        }
    }, { url: "https://mainz.local/pt/" });
});

Deno.test("e2e/ssg hydration: plain-static profile should keep MPA runtime without enhanced hooks", async () => {
    await buildSitePlainStatic();

    const hydrationManifest = await readHydrationManifest();
    assertEquals(hydrationManifest.navigation, "mpa");

    const routeHtmlPath = resolve(repoRoot, "dist/site/ssg/en/index.html");
    const html = await Deno.readTextFile(routeHtmlPath);
    const scriptSrc = extractModuleScriptSrc(html);
    assert(scriptSrc, "Could not find module script src in prerendered plain-static html.");

    const scriptPath = resolve(dirname(routeHtmlPath), scriptSrc);
    await Deno.stat(scriptPath);

    await withHappyDom(async () => {
        document.write(html);
        document.close();

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-plain-static`);
        await nextTick();

        assertEquals(document.documentElement.dataset.mainzNavigation, "mpa");
        assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);
        assertEquals(document.documentElement.dataset.mainzViewTransitions, undefined);
    }, { url: "https://mainz.local/en/" });
});

Deno.test("e2e/ssg hydration: 404 artifact should prerender and hydrate the site notFound page", async () => {
    await buildSiteSsg();

    const notFoundHtmlPath = resolve(repoRoot, "dist/site/ssg/404.html");
    const html = await Deno.readTextFile(notFoundHtmlPath);

    assertStringIncludes(html, "<x-mainz-not-found-page>");
    assertStringIncludes(html, "That route does not exist in Mainz.");

    const scriptSrc = extractModuleScriptSrc(html);
    assert(scriptSrc, "Could not find module script src in prerendered 404 html.");
    assertStringIncludes(scriptSrc, "/assets/");

    const scriptPath = resolveOutputScriptPath({ outputDir: resolve(repoRoot, "dist/site/ssg"), scriptSrc });
    await Deno.stat(scriptPath);

    await withHappyDom(async () => {
        document.write(html);
        document.close();

        assert(document.querySelector("#app x-mainz-not-found-page"));

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-404`);
        await nextTick();

        assertEquals(document.documentElement.dataset.mainzNavigation, "enhanced-mpa");
        assertStringIncludes(document.body.textContent ?? "", "That route does not exist in Mainz.");
    }, { url: "https://mainz.local/missing/route" });
});

Deno.test("e2e/ssg preview: missing routes should serve the built 404 page metadata", async () => {
    await buildSiteSsg();

    const handler = createSsgPreviewHandler(resolve(repoRoot, "dist/site/ssg"));
    const response = await handler(new Request("http://127.0.0.1:4173/bba/"));
    const html = await response.text();

    assertEquals(response.status, 404);
    assertStringIncludes(html, "<title>404 | Mainz</title>");
    assertStringIncludes(
        html,
        'content="Mainz page not found experience for static and enhanced MPA navigation."',
    );
    assertStringIncludes(html, "That route does not exist in Mainz.");
});

Deno.test("e2e/ssg preview: localized missing routes should hydrate the localized 404 page", async () => {
    await buildSiteSsg();

    const handler = createSsgPreviewHandler(resolve(repoRoot, "dist/site/ssg"));
    const response = await handler(new Request("http://127.0.0.1:4173/pt/dfdfhsdfsdf"));
    const html = await response.text();

    assertEquals(response.status, 404);
    assertStringIncludes(html, "<title>404 | Mainz</title>");

    const scriptSrc = extractModuleScriptSrc(html);
    assert(scriptSrc, "Could not find module script src in localized prerendered 404 html.");
    const scriptPath = resolveOutputScriptPath({ outputDir: resolve(repoRoot, "dist/site/ssg"), scriptSrc });
    await Deno.stat(scriptPath);

    await withHappyDom(async () => {
        document.write(html);
        document.close();

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-ssg-404-pt`);
        await nextTick();

        assertEquals(document.documentElement.lang, "pt");
        assertStringIncludes(document.body.textContent ?? "", "Essa rota nao existe no Mainz.");
    }, { url: "https://mainz.local/pt/dfdfhsdfsdf" });
});

Deno.test("e2e/ssg hydration: gh-pages profile should hydrate localized routes under a base path", async () => {
    await buildSiteGhPages();

    const ptRouteHtmlPath = resolve(repoRoot, "dist/site/ssg/pt/index.html");
    const ptHtml = await Deno.readTextFile(ptRouteHtmlPath);

    assertStringIncludes(ptHtml, "Iniciar trilha guiada");
    const ptScriptSrc = extractModuleScriptSrc(ptHtml);
    assert(ptScriptSrc, "Could not find module script src in gh-pages /pt/ html.");
    assertStringIncludes(ptScriptSrc, "../assets/");

    const ptScriptPath = resolve(dirname(ptRouteHtmlPath), ptScriptSrc);
    await Deno.stat(ptScriptPath);

    await withHappyDom(async () => {
        document.write(ptHtml);
        document.close();

        assertStringIncludes(document.body.textContent ?? "", "Iniciar trilha guiada");

        await import(`${pathToFileURL(ptScriptPath).href}?e2e=${Date.now()}-gh-pages-pt`);
        await nextTick();

        const hydratedText = document.body.textContent ?? "";
        assertStringIncludes(hydratedText, "Iniciar trilha guiada");

        if (hydratedText.includes("Start guided journey")) {
            throw new Error("Hydration switched /pt/ content to English unexpectedly.");
        }
    }, { url: "https://mainz.local/pt/" });
});

async function buildSiteSsg(): Promise<void> {
    await runMainzCliCommand(
        ["build", "--target", "site", "--mode", "ssg"],
        "Failed to build site for hydration e2e test.",
    );
}

async function buildSiteGhPages(): Promise<void> {
    await runMainzCliCommand(
        ["build", "--target", "site", "--profile", "gh-pages"],
        "Failed to build site for hydration e2e test.",
    );
}

async function buildSitePlainStatic(): Promise<void> {
    await runMainzCliCommand(
        ["build", "--target", "site", "--profile", "plain-static"],
        "Failed to build site for hydration e2e test.",
    );
}

async function readHydrationManifest(): Promise<{ target: string; hydration: string; navigation: string }> {
    const hydrationManifestPath = resolve(repoRoot, "dist/site/ssg/hydration.json");
    return await readJsonFile(hydrationManifestPath);
}
