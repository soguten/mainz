/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSsgPreviewHandler } from "../../../preview/ssg-server.ts";
import { withHappyDom } from "../../../ssg/happy-dom.ts";

const decoder = new TextDecoder();
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const [mode, navigation] = Deno.args as [("csr" | "ssg")?, ("spa" | "mpa" | "enhanced-mpa")?];

if (!mode || !navigation) {
    throw new Error("Usage: deno run -A ./src/cli/tests/helpers/not-found-matrix-check.ts <mode> <navigation>");
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

await assertNotFoundCase({
    mode,
    navigation,
    url: "https://mainz.local/pgffhgh",
    expectedLocale: "en",
    expectedText: "That route does not exist in Mainz.",
    alternateLocale: "pt",
    expectedAlternateHref: "/pt/pgffhgh/",
});

await assertNotFoundCase({
    mode,
    navigation,
    url: "https://mainz.local/pt/dfdfhsdfsdf",
    expectedLocale: "pt",
    expectedText: "Essa rota nao existe no Mainz.",
    alternateLocale: "en",
    expectedAlternateHref: "/en/dfdfhsdfsdf",
});

async function assertNotFoundCase(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    url: string;
    expectedLocale: "en" | "pt";
    expectedText: string;
    alternateLocale: "en" | "pt";
    expectedAlternateHref: string;
}): Promise<void> {
    const fixture = await resolveNotFoundFixture(args.mode, args.navigation, args.url);
    const scriptSrc = extractModuleScriptSrc(fixture.html);
    assert(scriptSrc, `Could not find module script src for ${args.mode} + ${args.navigation} (${args.url}).`);

    const scriptPath = resolveOutputScriptPath(fixture.outputDir, fixture.htmlPath, scriptSrc);
    await Deno.stat(scriptPath);

    if (fixture.responseStatus !== undefined) {
        assertEquals(fixture.responseStatus, 404);
    }

    await withHappyDom(async () => {
        document.write(fixture.html);
        document.close();

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${args.mode}-${args.navigation}-${args.expectedLocale}`);
        await nextTick();

        assertEquals(document.documentElement.dataset.mainzNavigation, args.navigation);
        assertEquals(document.title, "404 | Mainz");
        assertEquals(document.documentElement.lang, args.expectedLocale);
        assertStringIncludes(document.body.textContent ?? "", args.expectedText);
        assertEquals(
            document.querySelector<HTMLAnchorElement>(`a[data-locale="${args.alternateLocale}"]`)?.getAttribute("href"),
            args.expectedAlternateHref,
        );
    }, { url: args.url });
}

async function resolveNotFoundFixture(
    renderMode: "csr" | "ssg",
    navigationMode: "spa" | "mpa" | "enhanced-mpa",
    url: string,
): Promise<{ html: string; htmlPath: string; outputDir: string; responseStatus?: number }> {
    const outputDir = resolve(repoRoot, `dist/site/${renderMode}`);

    if (renderMode === "csr" && navigationMode === "spa") {
        const htmlPath = resolve(outputDir, "index.html");
        return {
            html: await Deno.readTextFile(htmlPath),
            htmlPath,
            outputDir,
        };
    }

    const handler = createSsgPreviewHandler(outputDir);
    const response = await handler(new Request(url.replace("https://mainz.local", "http://127.0.0.1:4173")));

    return {
        html: await Deno.readTextFile(resolve(outputDir, "404.html")),
        htmlPath: resolve(outputDir, "404.html"),
        outputDir,
        responseStatus: response.status,
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
    throw new Error(`Failed to build site for 404 matrix check.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
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
