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
    throw new Error("Usage: deno run -A ./src/cli/tests/helpers/routing-matrix-check.ts <mode> <navigation>");
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

await assertRoute({
    mode,
    navigation,
    path: "/en/",
    expectedStatus: 200,
    expectedLocale: "en",
    expectedTitle: "Mainz",
    expectedText: "Start guided journey",
});

await assertRoute({
    mode,
    navigation,
    path: "/pt/",
    expectedStatus: 200,
    expectedLocale: "pt",
    expectedTitle: "Mainz",
    expectedText: "Iniciar trilha guiada",
});

await assertRoute({
    mode,
    navigation,
    path: "/pt/dfdfhsdfsdf",
    expectedStatus: 404,
    expectedLocale: "pt",
    expectedTitle: "404 | Mainz",
    expectedText: "Essa rota nao existe no Mainz.",
});

async function assertRoute(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    path: string;
    expectedStatus: 200 | 404;
    expectedLocale: "en" | "pt";
    expectedTitle: string;
    expectedText: string;
}): Promise<void> {
    const fixture = await resolveRouteFixture(args.mode, args.navigation, args.path);
    const scriptSrc = extractModuleScriptSrc(fixture.html);
    assert(scriptSrc, `Could not find module script src for ${args.mode} + ${args.navigation} (${args.path}).`);

    const scriptPath = resolveOutputScriptPath(fixture.outputDir, fixture.htmlPath, scriptSrc);
    await Deno.stat(scriptPath);

    if (fixture.responseStatus !== undefined) {
        assertEquals(fixture.responseStatus, args.expectedStatus);
    }

    await withHappyDom(async () => {
        document.write(fixture.html);
        document.close();

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${args.mode}-${args.navigation}-${encodeURIComponent(args.path)}`);
        await nextTick();

        assertEquals(document.documentElement.dataset.mainzNavigation, args.navigation);
        assertEquals(document.documentElement.lang, args.expectedLocale);
        assertEquals(document.title, args.expectedTitle);
        assertStringIncludes(document.body.textContent ?? "", args.expectedText);
    }, { url: `https://mainz.local${args.path}` });
}

async function resolveRouteFixture(
    renderMode: "csr" | "ssg",
    navigationMode: "spa" | "mpa" | "enhanced-mpa",
    routePath: string,
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
    const response = await handler(new Request(`http://127.0.0.1:4173${routePath}`));

    if (response.status === 404) {
        return {
            html: await Deno.readTextFile(resolve(outputDir, "404.html")),
            htmlPath: resolve(outputDir, "404.html"),
            outputDir,
            responseStatus: response.status,
        };
    }

    const htmlPath = resolveOutputHtmlPath(outputDir, routePath);
    return {
        html: await Deno.readTextFile(htmlPath),
        htmlPath,
        outputDir,
        responseStatus: response.status,
    };
}

function resolveOutputHtmlPath(outputDir: string, routePath: string): string {
    const normalizedPath = routePath.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!normalizedPath) {
        return resolve(outputDir, "index.html");
    }

    return resolve(outputDir, normalizedPath, "index.html");
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
    throw new Error(`Failed to build site for routing matrix check.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
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
