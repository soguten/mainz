/// <reference lib="deno.ns" />

import { assert, assertEquals } from "@std/assert";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withHappyDom } from "../../../ssg/happy-dom.ts";

const decoder = new TextDecoder();
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const [mode, navigation] = Deno.args as [("csr" | "ssg")?, ("spa" | "mpa" | "enhanced-mpa")?];

if (!mode || !navigation) {
    throw new Error("Usage: deno run -A ./src/cli/tests/helpers/head-matrix-check.ts <mode> <navigation>");
}

await runBuildCommand([
    "build",
    "--target",
    "site",
    "--mode",
    mode,
    "--navigation",
    navigation,
]);

const htmlFixture = await resolveHtmlFixture(mode, navigation);
const scriptSrc = extractModuleScriptSrc(htmlFixture.html);
assert(scriptSrc, `Could not find module script src for ${mode} + ${navigation}.`);

const scriptPath = resolveOutputScriptPath(htmlFixture.outputDir, htmlFixture.htmlPath, scriptSrc);
await Deno.stat(scriptPath);

await withHappyDom(async () => {
    document.write(htmlFixture.html);
    document.close();

    await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${mode}-${navigation}`);
    await nextTick();

    assertEquals(document.head.querySelectorAll('link[rel="canonical"]').length, 1);
    assertEquals(document.head.querySelectorAll('link[rel="alternate"][hreflang]').length, 3);
    assertEquals(document.head.querySelectorAll('link[rel="canonical"][data-mainz-head-managed="true"]').length, 1);
    assertEquals(document.head.querySelectorAll('link[rel="alternate"][hreflang][data-mainz-head-managed="true"]').length, 3);
    assertEquals(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"), "/pt/");
    assertEquals(readAlternateHref("en"), "/en/");
    assertEquals(readAlternateHref("pt"), "/pt/");
    assertEquals(readAlternateHref("x-default"), "/en/");
}, { url: htmlFixture.url });

async function resolveHtmlFixture(
    renderMode: "csr" | "ssg",
    navigationMode: "spa" | "mpa" | "enhanced-mpa",
): Promise<{ html: string; htmlPath: string; outputDir: string; url: string }> {
    const outputDir = resolve(repoRoot, `dist/site/${renderMode}`);

    if (renderMode === "csr" && navigationMode === "spa") {
        const htmlPath = resolve(outputDir, "index.html");
        return {
            html: await Deno.readTextFile(htmlPath),
            htmlPath,
            outputDir,
            url: "https://mainz.local/pt/",
        };
    }

    const htmlPath = resolve(outputDir, "pt", "index.html");
    return {
        html: await Deno.readTextFile(htmlPath),
        htmlPath,
        outputDir,
        url: "https://mainz.local/pt/",
    };
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
    throw new Error(`Failed to build site for head matrix check.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
}

function extractModuleScriptSrc(html: string): string | null {
    const match = html.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/i);
    return match?.[1] ?? null;
}

function resolveOutputScriptPath(outputDir: string, htmlPath: string, scriptSrc: string): string {
    if (scriptSrc.startsWith("/")) {
        return resolve(outputDir, `.${scriptSrc}`);
    }

    return resolve(dirname(htmlPath), scriptSrc);
}

async function nextTick(): Promise<void> {
    await Promise.resolve();
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
}

function readAlternateHref(hreflang: string): string | null {
    return document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)?.getAttribute("href") ?? null;
}
