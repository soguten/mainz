/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withHappyDom } from "../../../ssg/happy-dom.ts";

const decoder = new TextDecoder();
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const [mode, navigation] = Deno.args as [("csr" | "ssg")?, ("spa" | "mpa" | "enhanced-mpa")?];

if (!mode || !navigation) {
    throw new Error("Usage: deno run -A ./src/cli/tests/helpers/i18n-matrix-check.ts <mode> <navigation>");
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

await assertRootLocaleRedirect({
    mode,
    navigation,
    navigatorLocale: "pt-BR",
    expectedPathname: "/pt/",
});

await assertRootLocaleRedirect({
    mode,
    navigation,
    navigatorLocale: "es-ES",
    expectedPathname: "/en/",
});

await assertLocalizedRoute({
    mode,
    navigation,
    locale: "en",
    expectedText: "Start guided journey",
    alternateHref: "/pt/",
});

await assertLocalizedRoute({
    mode,
    navigation,
    locale: "pt",
    expectedText: "Iniciar trilha guiada",
    alternateHref: "/en/",
});

async function assertRootLocaleRedirect(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    navigatorLocale: string;
    expectedPathname: string;
}): Promise<void> {
    const outputDir = resolve(repoRoot, `dist/site/${args.mode}`);
    const rootHtmlPath = resolve(outputDir, "index.html");
    const html = await Deno.readTextFile(rootHtmlPath);

    if (args.mode === "csr" && args.navigation === "spa") {
        const scriptSrc = extractModuleScriptSrc(html);
        assert(scriptSrc, "Could not find CSR SPA root module script.");

        const scriptPath = resolveOutputScriptPath(outputDir, rootHtmlPath, scriptSrc);
        await Deno.stat(scriptPath);

        await withHappyDom(async (window) => {
            overrideGlobalNavigatorLocale(args.navigatorLocale);
            document.write(html);
            document.close();

            await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${args.mode}-${args.navigation}-root`);
            await waitFor(() => window.location.pathname === args.expectedPathname);
        }, { url: "https://mainz.local/" });

        return;
    }

    const redirectScript = extractInlineRedirectScript(html);
    assert(redirectScript, `Could not find locale redirect script for ${args.mode} + ${args.navigation}.`);
    assertStringIncludes(html, '<title>Redirecting...</title>');
    assertStringIncludes(html, '<link rel="canonical"');

    await withHappyDom(async (window) => {
        overrideNavigatorLocale(window.navigator, args.navigatorLocale);
        document.write(html);
        document.close();

        window.eval(redirectScript);
        await nextTick();

        assertEquals(window.location.pathname, args.expectedPathname);
    }, { url: "https://mainz.local/" });
}

async function assertLocalizedRoute(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    locale: "en" | "pt";
    expectedText: string;
    alternateHref: string;
}): Promise<void> {
    const fixture = await resolveLocalizedRouteFixture(args.mode, args.navigation, args.locale);
    const scriptSrc = extractModuleScriptSrc(fixture.html);

    assert(scriptSrc, `Could not find module script src for ${args.mode} + ${args.navigation} (${args.locale}).`);

    const scriptPath = resolveOutputScriptPath(fixture.outputDir, fixture.htmlPath, scriptSrc);
    await Deno.stat(scriptPath);

    await withHappyDom(async () => {
        document.write(fixture.html);
        document.close();

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${args.mode}-${args.navigation}-${args.locale}`);
        await nextTick();

        assertEquals(document.documentElement.dataset.mainzNavigation, args.navigation);
        assertEquals(document.documentElement.lang, args.locale);
        assertEquals(document.title, "Mainz");
        assertStringIncludes(document.body.textContent ?? "", args.expectedText);
        assertEquals(
            document.querySelector<HTMLAnchorElement>(`a[data-locale="${args.locale === "en" ? "pt" : "en"}"]`)?.getAttribute("href"),
            args.alternateHref,
        );
    }, { url: `https://mainz.local/${args.locale}/` });
}

async function resolveLocalizedRouteFixture(
    renderMode: "csr" | "ssg",
    navigationMode: "spa" | "mpa" | "enhanced-mpa",
    locale: "en" | "pt",
): Promise<{ html: string; htmlPath: string; outputDir: string }> {
    const outputDir = resolve(repoRoot, `dist/site/${renderMode}`);

    if (renderMode === "csr" && navigationMode === "spa") {
        const htmlPath = resolve(outputDir, "index.html");
        return {
            html: await Deno.readTextFile(htmlPath),
            htmlPath,
            outputDir,
        };
    }

    const htmlPath = resolve(outputDir, locale, "index.html");
    return {
        html: await Deno.readTextFile(htmlPath),
        htmlPath,
        outputDir,
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
    throw new Error(`Failed to build site for i18n matrix check.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
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
