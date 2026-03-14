/// <reference lib="deno.ns" />

import { assert, assertNotEquals, assertStringIncludes } from "@std/assert";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withHappyDom } from "../../ssg/happy-dom.ts";

const decoder = new TextDecoder();
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

Deno.test("e2e/ssg hydration: prerendered site should hydrate and keep click interactivity", async () => {
    await buildSiteSsg();

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
    await runBuildCommand(["build", "--target", "site", "--mode", "ssg"]);
}

async function buildSiteGhPages(): Promise<void> {
    await runBuildCommand(["build", "--target", "site", "--profile", "gh-pages"]);
}

async function runBuildCommand(args: string[]): Promise<void> {
    const command = new Deno.Command("deno", {
        args: [
            "run",
            "-A",
            "./src/cli/mainz.ts",
            ...args,
        ],
        cwd: repoRoot,
        stdout: "piped",
        stderr: "piped",
    });

    const result = await command.output();
    if (result.success) {
        return;
    }

    const stdout = decoder.decode(result.stdout);
    const stderr = decoder.decode(result.stderr);
    throw new Error(
        `Failed to build site for hydration e2e test.\nstdout:\n${stdout}\nstderr:\n${stderr}`,
    );
}

function extractModuleScriptSrc(html: string): string | null {
    const match = html.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/i);
    return match?.[1] ?? null;
}

async function nextTick(): Promise<void> {
    await Promise.resolve();
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
}
