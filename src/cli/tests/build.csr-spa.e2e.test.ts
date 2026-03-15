/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withHappyDom } from "../../ssg/happy-dom.ts";

const decoder = new TextDecoder();
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

Deno.test("e2e/csr spa: build should emit a direct-load shell that works for localized routes and notFound routes", async () => {
    await buildSiteCsrSpa();

    const rootHtmlPath = resolve(repoRoot, "dist/site/csr/index.html");
    const html = await Deno.readTextFile(rootHtmlPath);
    const scriptSrc = extractModuleScriptSrc(html);

    assert(scriptSrc, "Could not find module script src in CSR SPA html.");
    assertStringIncludes(scriptSrc, "/assets/");

    const scriptPath = resolveOutputScriptPath(resolve(repoRoot, "dist/site/csr"), scriptSrc);
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
        assertEquals(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"), "/pt/");
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
        assertStringIncludes(document.body.textContent ?? "", "That route does not exist in Mainz.");
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
    await runBuildCommand(["build", "--target", "site", "--mode", "csr", "--navigation", "spa"]);
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
        `Failed to build site for CSR SPA e2e test.\nstdout:\n${stdout}\nstderr:\n${stderr}`,
    );
}

function extractModuleScriptSrc(html: string): string | null {
    const match = html.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/i);
    return match?.[1] ?? null;
}

function resolveOutputScriptPath(outputDir: string, scriptSrc: string): string {
    if (scriptSrc.startsWith("/")) {
        return resolve(outputDir, `.${scriptSrc}`);
    }

    return resolve(outputDir, scriptSrc);
}

async function nextTick(): Promise<void> {
    await Promise.resolve();
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
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
    return document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)?.getAttribute("href") ?? null;
}
