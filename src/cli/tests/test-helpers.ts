import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSsgPreviewHandler } from "../../preview/ssg-server.ts";
import { assertEquals, assertStringIncludes } from "@std/assert";

const decoder = new TextDecoder();

export type CliTestRenderMode = "csr" | "ssg";
export type CliTestNavigationMode = "spa" | "mpa" | "enhanced-mpa";
export type CliTestCombination = {
    mode: CliTestRenderMode;
    navigation: CliTestNavigationMode;
};

export const cliTestsRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const cliTestCombinations = [
    { mode: "ssg", navigation: "spa" },
    { mode: "ssg", navigation: "mpa" },
    { mode: "ssg", navigation: "enhanced-mpa" },
    { mode: "csr", navigation: "spa" },
    { mode: "csr", navigation: "mpa" },
    { mode: "csr", navigation: "enhanced-mpa" },
] as const satisfies readonly CliTestCombination[];

export async function runCliCommand(
    args: readonly string[],
    errorMessage: string,
    cwd = cliTestsRepoRoot,
): Promise<{ stdout: string; stderr: string }> {
    const command = new Deno.Command("deno", {
        args: [...args],
        cwd,
        stdout: "piped",
        stderr: "piped",
    });

    const result = await command.output();
    const stdout = decoder.decode(result.stdout);
    const stderr = decoder.decode(result.stderr);

    if (!result.success) {
        throw new Error(`${errorMessage}\nstdout:\n${stdout}\nstderr:\n${stderr}`);
    }

    return { stdout, stderr };
}

export async function runMainzCliCommand(
    args: readonly string[],
    errorMessage: string,
): Promise<{ stdout: string; stderr: string }> {
    return await runCliCommand(["run", "-A", "./src/cli/mainz.ts", ...args], errorMessage);
}

export async function runCliHelperScript(
    scriptPath: string,
    args: readonly string[],
    errorMessage: string,
): Promise<void> {
    await runCliCommand(["run", "-A", scriptPath, ...args], errorMessage);
}

export function extractModuleScriptSrc(html: string): string | null {
    const match = html.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/i);
    return match?.[1] ?? null;
}

export function resolveOutputScriptPath(args: {
    outputDir: string;
    scriptSrc: string;
    htmlPath?: string;
    basePath?: string;
}): string {
    if (args.scriptSrc.startsWith("/")) {
        if (args.basePath) {
            const normalizedBasePath = args.basePath.replace(/\/+$/, "/");
            const sourceWithoutBasePath = args.scriptSrc.startsWith(normalizedBasePath)
                ? args.scriptSrc.slice(normalizedBasePath.length - 1)
                : args.scriptSrc;
            return resolve(args.outputDir, `.${sourceWithoutBasePath}`);
        }

        return resolve(args.outputDir, `.${args.scriptSrc}`);
    }

    return resolve(args.htmlPath ? dirname(args.htmlPath) : args.outputDir, args.scriptSrc);
}

export function resolveOutputHtmlPath(outputDir: string, routePath: string): string {
    const normalizedPath = routePath.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!normalizedPath) {
        return resolve(outputDir, "index.html");
    }

    return resolve(outputDir, normalizedPath, "index.html");
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
    return JSON.parse(await Deno.readTextFile(filePath)) as T;
}

export async function resolveDirectLoadFixture(args: {
    outputDir: string;
    renderMode: CliTestRenderMode;
    navigationMode: CliTestNavigationMode;
    documentHtmlPath: string;
    spaHtmlPath?: string;
    url?: string;
}): Promise<{
    html: string;
    htmlPath: string;
    outputDir: string;
    url?: string;
}> {
    const htmlPath = resolve(
        args.outputDir,
        args.renderMode === "csr" && args.navigationMode === "spa"
            ? args.spaHtmlPath ?? "index.html"
            : args.documentHtmlPath,
    );

    return {
        html: await Deno.readTextFile(htmlPath),
        htmlPath,
        outputDir: args.outputDir,
        url: args.url,
    };
}

export async function resolvePreviewFixture(args: {
    outputDir: string;
    renderMode: CliTestRenderMode;
    navigationMode: CliTestNavigationMode;
    requestUrl: string;
    resolveHtmlPath(responseStatus: number): string;
    spaHtmlPath?: string;
}): Promise<{
    html: string;
    htmlPath: string;
    outputDir: string;
    responseStatus?: number;
}> {
    if (args.renderMode === "csr" && args.navigationMode === "spa") {
        const fixture = await resolveDirectLoadFixture({
            outputDir: args.outputDir,
            renderMode: args.renderMode,
            navigationMode: args.navigationMode,
            documentHtmlPath: args.resolveHtmlPath(200),
            spaHtmlPath: args.spaHtmlPath,
        });

        return {
            html: fixture.html,
            htmlPath: fixture.htmlPath,
            outputDir: fixture.outputDir,
        };
    }

    const handler = createSsgPreviewHandler(args.outputDir);
    const response = await handler(new Request(args.requestUrl));
    const htmlPath = args.resolveHtmlPath(response.status);

    return {
        html: await Deno.readTextFile(htmlPath),
        htmlPath,
        outputDir: args.outputDir,
        responseStatus: response.status,
    };
}

export function readCanonicalHref(): string | null {
    return document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;
}

export function readAlternateHref(hreflang: string): string | null {
    return document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)?.getAttribute("href") ?? null;
}

export function assertDocumentState(args: {
    navigation?: CliTestNavigationMode;
    locale?: string;
    title?: string;
    bodyIncludes?: string | readonly string[];
}): void {
    if (args.navigation) {
        assertEquals(document.documentElement.dataset.mainzNavigation, args.navigation);
    }

    if (args.locale) {
        assertEquals(document.documentElement.lang, args.locale);
    }

    if (typeof args.title === "string") {
        assertEquals(document.title, args.title);
    }

    const snippets = typeof args.bodyIncludes === "string"
        ? [args.bodyIncludes]
        : args.bodyIncludes ?? [];

    for (const snippet of snippets) {
        assertStringIncludes(document.body.textContent ?? "", snippet);
    }
}

export function assertSeoState(args: {
    canonical?: string;
    alternates?: Readonly<Record<string, string>>;
}): void {
    if (typeof args.canonical === "string") {
        assertEquals(readCanonicalHref(), args.canonical);
    }

    for (const [hreflang, href] of Object.entries(args.alternates ?? {})) {
        assertEquals(readAlternateHref(hreflang), href);
    }
}
