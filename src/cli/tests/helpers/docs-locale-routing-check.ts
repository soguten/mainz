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
    throw new Error(
        "Usage: deno run -A ./src/cli/tests/helpers/docs-locale-routing-check.ts <mode> <navigation>",
    );
}

await runBuildCommand([
    "build",
    "--target",
    "docs",
    "--mode",
    mode,
    "--navigation",
    navigation,
]);

await assertRootLocaleRedirect({ mode, navigation });
await assertLocalizedHomeLinks({ mode, navigation });
await assertLocalizedDocsRoute({ mode, navigation });

async function assertRootLocaleRedirect(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
}): Promise<void> {
    const outputDir = resolve(repoRoot, `dist/docs/${args.mode}`);
    const rootHtmlPath = resolve(outputDir, "index.html");
    const html = await Deno.readTextFile(rootHtmlPath);

    if (args.mode === "csr" && args.navigation === "spa") {
        const scriptSrc = extractModuleScriptSrc(html);
        assert(scriptSrc, "Could not find docs CSR SPA root module script.");

        const scriptPath = resolveOutputScriptPath(outputDir, rootHtmlPath, scriptSrc);
        await Deno.stat(scriptPath);

        await withHappyDom(async (window) => {
            overrideGlobalNavigatorLocale("en-US");
            document.write(html);
            document.close();

            await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${args.mode}-${args.navigation}-root`);
            await waitFor(() => window.location.pathname === "/en/");
        }, { url: "https://mainz.local/" });

        return;
    }

    const redirectScript = extractInlineRedirectScript(html);
    assert(redirectScript, `Could not find docs locale redirect script for ${args.mode} + ${args.navigation}.`);

    await withHappyDom(async (window) => {
        overrideNavigatorLocale(window.navigator, "en-US");
        document.write(html);
        document.close();

        window.eval(redirectScript);
        await nextTick();

        assertEquals(window.location.pathname, "/en/");
    }, { url: "https://mainz.local/" });
}

async function assertLocalizedHomeLinks(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
}): Promise<void> {
    const fixture = await resolveRouteFixture(args.mode, args.navigation, "/en/");
    const scriptSrc = extractModuleScriptSrc(fixture.html);
    assert(scriptSrc, `Could not find docs module script for ${args.mode} + ${args.navigation} (/en/).`);

    const scriptPath = resolveOutputScriptPath(fixture.outputDir, fixture.htmlPath, scriptSrc);
    await Deno.stat(scriptPath);

    await withHappyDom(async () => {
        document.write(fixture.html);
        document.close();

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${args.mode}-${args.navigation}-home`);
        await waitFor(() => document.title === "Mainz Docs");

        assertEquals(document.documentElement.lang, "en");
        assertEquals(readAnchorHref("Overview"), "/en/");
        assertEquals(readAnchorHref("Guides"), "/en/docs/quickstart");
        assertEquals(readAnchorHref("Reference"), "/en/docs/data-loading");
        assert(document.querySelector('a[href="/en/docs/quickstart"]'));

        if (args.navigation === "spa") {
            const guidesLink = Array.from(document.querySelectorAll("a"))
                .find((anchor) => anchor.textContent?.trim() === "Guides");
            assert(guidesLink instanceof HTMLElement);

            guidesLink.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
            await waitFor(() =>
                window.location.pathname === "/en/docs/quickstart" &&
                (document.body.textContent ?? "").includes("Why Mainz")
            );
        }
    }, { url: "https://mainz.local/en/" });
}

async function assertLocalizedDocsRoute(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
}): Promise<void> {
    const fixture = await resolveRouteFixture(args.mode, args.navigation, "/en/docs/quickstart");
    const scriptSrc = extractModuleScriptSrc(fixture.html);
    assert(scriptSrc, `Could not find docs module script for ${args.mode} + ${args.navigation} (/en/docs/quickstart).`);

    const scriptPath = resolveOutputScriptPath(fixture.outputDir, fixture.htmlPath, scriptSrc);
    await Deno.stat(scriptPath);

    if (fixture.responseStatus !== undefined) {
        assertEquals(fixture.responseStatus, 200);
    }

    await withHappyDom(async () => {
        document.write(fixture.html);
        document.close();

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${args.mode}-${args.navigation}-quickstart`);
        await waitFor(() => (document.body.textContent ?? "").includes("Why Mainz"));

        assertEquals(document.documentElement.lang, "en");
        assertStringIncludes(document.body.textContent ?? "", "Why Mainz");
        assertStringIncludes(document.body.textContent ?? "", "Create your first page");
        assert(!(document.body.textContent ?? "").includes("Document not found"));
        assertEquals(readAnchorHref("Guides"), "/en/docs/quickstart");
    }, { url: "https://mainz.local/en/docs/quickstart" });
}

async function resolveRouteFixture(
    renderMode: "csr" | "ssg",
    navigationMode: "spa" | "mpa" | "enhanced-mpa",
    routePath: string,
): Promise<{ html: string; htmlPath: string; outputDir: string; responseStatus?: number }> {
    const outputDir = resolve(repoRoot, `dist/docs/${renderMode}`);

    if (renderMode === "csr" && navigationMode === "spa") {
        const htmlPath = resolve(outputDir, "index.html");
        return {
            html: await Deno.readTextFile(htmlPath),
            htmlPath,
            outputDir,
        };
    }

    const handler = createSsgPreviewHandler(outputDir);
    const response = await handler(new Request(`http://127.0.0.1:4175${routePath}`));
    const htmlPath = resolveOutputHtmlPath(outputDir, routePath);

    return {
        html: await Deno.readTextFile(htmlPath),
        htmlPath,
        outputDir,
        responseStatus: response.status,
    };
}

async function runBuildCommand(args: string[]): Promise<void> {
    const command = new Deno.Command("deno", {
        args: ["run", "-A", "./src/cli/mainz.ts", ...args],
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
    throw new Error(`Failed to build docs for locale routing check.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
}

function extractInlineRedirectScript(html: string): string | null {
    const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/i);
    return match?.[1]?.trim() ?? null;
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

function resolveOutputHtmlPath(outputDir: string, routePath: string): string {
    const normalizedPath = routePath.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!normalizedPath) {
        return resolve(outputDir, "index.html");
    }

    return resolve(outputDir, normalizedPath, "index.html");
}

function readAnchorHref(label: string): string | null {
    const anchor = Array.from(document.querySelectorAll("a"))
        .find((candidate) => candidate.textContent?.trim() === label);
    return anchor?.getAttribute("href") ?? null;
}

function overrideNavigatorLocale(
    navigatorLike: {
        language?: string;
        languages?: readonly string[];
    },
    locale: string,
): void {
    Object.defineProperty(navigatorLike, "language", {
        configurable: true,
        value: locale,
    });

    Object.defineProperty(navigatorLike, "languages", {
        configurable: true,
        value: [locale],
    });
}

function overrideGlobalNavigatorLocale(locale: string): void {
    const navigatorProxy = Object.create(navigator);

    Object.defineProperty(navigatorProxy, "language", {
        configurable: true,
        value: locale,
    });

    Object.defineProperty(navigatorProxy, "languages", {
        configurable: true,
        value: [locale],
    });

    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        writable: true,
        value: navigatorProxy,
    });
}

async function nextTick(): Promise<void> {
    await Promise.resolve();
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
}

async function waitFor(predicate: () => boolean, message = "Expected condition to become true."): Promise<void> {
    for (let attempt = 0; attempt < 25; attempt += 1) {
        if (predicate()) {
            return;
        }

        await nextTick();
    }

    throw new Error(message);
}
