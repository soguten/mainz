import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
    MAINZ_LOCALE_CHANGE_EVENT,
    MAINZ_NAVIGATION_ABORT_EVENT,
    MAINZ_NAVIGATION_ERROR_EVENT,
    MAINZ_NAVIGATION_READY_EVENT,
    MAINZ_NAVIGATION_START_EVENT,
    type MainzLocaleChangeDetail,
    type MainzNavigationAbortDetail,
    type MainzNavigationErrorDetail,
    type MainzNavigationReadyDetail,
    type MainzNavigationStartDetail,
} from "../../src/runtime-events.ts";
import { createSsgPreviewHandler } from "../../src/preview/ssg-server.ts";
import { waitFor, waitForCustomEvent } from "../../src/testing/async-testing.ts";
import { assertEquals, assertStringIncludes } from "@std/assert";

const decoder = new TextDecoder();

export type CliTestRenderMode = "csr" | "ssg";
export type CliTestNavigationMode = "spa" | "mpa" | "enhanced-mpa";
export type CliTestCombination = {
    mode: CliTestRenderMode;
    navigation: CliTestNavigationMode;
};
export type CliBuildContext = {
    fixtureName?: string;
    fixtureRoot?: string;
    outputDir: string;
    targetName: string;
    mode: CliTestRenderMode;
    navigation: CliTestNavigationMode;
    profile?: string;
    configPath?: string;
    cleanup?(): Promise<void>;
};
export type CliFixtureTargetConfig = {
    configPath: string;
    fixtureRoot: string;
    outputDir: string;
    targetName: string;
    cleanup(): Promise<void>;
};

export const cliTestsRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
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

export async function buildCoreContractsForCombination(
    combination: CliTestCombination,
): Promise<CliBuildContext> {
    const fixture = await createCliFixtureTargetConfig({
        fixtureName: "core-contracts",
        targetName: "core-contracts",
    });

    try {
        const context = await buildFixtureForCombination({
            fixture,
            combination,
        });

        return createBuildContext({
            ...context,
            cleanup: fixture.cleanup,
        });
    } catch (error) {
        await fixture.cleanup();
        throw error;
    }
}

export async function buildFixtureForCombination(args: {
    fixture: CliFixtureTargetConfig;
    combination: CliTestCombination;
    profile?: string;
}): Promise<CliBuildContext> {
    await runMainzCliCommand(
        [
            "build",
            "--config",
            args.fixture.configPath,
            "--target",
            args.fixture.targetName,
            ...(args.profile ? ["--profile", args.profile] : []),
            "--mode",
            args.combination.mode,
            "--navigation",
            args.combination.navigation,
        ],
        `Failed to build ${args.fixture.targetName} for ${args.combination.mode} + ${args.combination.navigation}.`,
    );

    return createBuildContext({
        fixtureName: args.fixture.targetName,
        fixtureRoot: args.fixture.fixtureRoot,
        outputDir: resolve(args.fixture.outputDir, args.combination.mode),
        targetName: args.fixture.targetName,
        mode: args.combination.mode,
        navigation: args.combination.navigation,
        profile: args.profile,
        configPath: args.fixture.configPath,
    });
}

export async function createCliFixtureTargetConfig(args: {
    fixtureName: string;
    targetName?: string;
    appFile?: string;
    omitPagesDir?: boolean;
    locales?: readonly string[];
    defaultLocale?: string;
    localePrefix?: "auto" | "always";
    defaultMode?: CliTestRenderMode;
    defaultNavigation?: CliTestNavigationMode;
    authorizationPolicyNames?: readonly string[];
}): Promise<CliFixtureTargetConfig> {
    const fixtureRoot = resolve(
        cliTestsRepoRoot,
        "tests",
        "fixtures",
        args.fixtureName,
    );
    const targetName = args.targetName ?? args.fixtureName;
    const tempRoot = await Deno.makeTempDir({
        dir: cliTestsRepoRoot,
        prefix: `.mainz-fixture-${args.fixtureName}-`,
    });
    const configPath = resolve(tempRoot, "mainz.fixture.config.ts");
    const outputDir = resolve(tempRoot, "dist", targetName);
    const pagesDir = resolve(fixtureRoot, "src", "pages");
    const requestedAppFile = args.appFile
        ? resolve(fixtureRoot, args.appFile)
        : resolve(fixtureRoot, "src", "main.tsx");
    const viteConfig = resolve(fixtureRoot, "vite.config.ts");
    const buildConfigPath = resolve(fixtureRoot, "mainz.build.ts");
    const hasBuildConfig = await fileExists(buildConfigPath);
    const includeAppFile = args.appFile !== undefined || await fileExists(requestedAppFile);

    const locales = args.locales ?? ["en", "pt"];
    const defaultLocale = args.defaultLocale ?? locales[0];
    const localePrefix = args.localePrefix ?? "auto";
    const defaultMode = args.defaultMode ?? "ssg";
    const defaultNavigation = args.defaultNavigation ?? "enhanced-mpa";
    const authorizationPolicyNames = args.authorizationPolicyNames;

    await Deno.writeTextFile(
        configPath,
        [
            "export default {",
            "  targets: [",
            "    {",
            `      name: ${JSON.stringify(targetName)},`,
            `      rootDir: ${JSON.stringify(fixtureRoot)},`,
            `      viteConfig: ${JSON.stringify(viteConfig)},`,
            ...(args.omitPagesDir ? [] : [`      pagesDir: ${JSON.stringify(pagesDir)},`]),
            ...(includeAppFile ? [`      appFile: ${JSON.stringify(requestedAppFile)},`] : []),
            ...(hasBuildConfig ? [`      buildConfig: ${JSON.stringify(buildConfigPath)},`] : []),
            `      outDir: ${JSON.stringify(outputDir)},`,
            `      locales: ${JSON.stringify(locales)},`,
            "      i18n: {",
            `        defaultLocale: ${JSON.stringify(defaultLocale)},`,
            `        localePrefix: ${JSON.stringify(localePrefix)},`,
            `        fallbackLocale: ${JSON.stringify(defaultLocale)}`,
            "      },",
            ...(authorizationPolicyNames?.length
                ? [
                    "      authorization: {",
                    `        policyNames: ${JSON.stringify(authorizationPolicyNames)}`,
                    "      },",
                ]
                : []),
            `      defaultMode: ${JSON.stringify(defaultMode)},`,
            `      defaultNavigation: ${JSON.stringify(defaultNavigation)}`,
            "    }",
            "  ],",
            "  render: {",
            '    modes: ["csr", "ssg"]',
            "  }",
            "};",
            "",
        ].join("\n"),
    );

    return {
        configPath,
        fixtureRoot,
        outputDir,
        targetName,
        async cleanup() {
            await Deno.remove(tempRoot, { recursive: true }).catch(() => undefined);
        },
    };
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
    return document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)
        ?.getAttribute("href") ?? null;
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

export async function waitForNextLocaleChange(
    expectedLocale?: string,
): Promise<MainzLocaleChangeDetail> {
    return await waitForCustomEvent<MainzLocaleChangeDetail>(MAINZ_LOCALE_CHANGE_EVENT, {
        predicate: (detail) => {
            if (!detail?.locale) {
                return false;
            }

            return expectedLocale ? detail.locale === expectedLocale : true;
        },
        message: expectedLocale
            ? `Expected locale bootstrap event for ${expectedLocale}.`
            : "Expected locale bootstrap event.",
    });
}

export async function waitForNextNavigationReady(options?: {
    target?: EventTarget;
    mode?: MainzNavigationReadyDetail["mode"];
    path?: string;
    matchedPath?: string;
    locale?: string;
    navigationType?: MainzNavigationReadyDetail["navigationType"];
    navigationSequence?: number;
}): Promise<MainzNavigationReadyDetail> {
    return await waitForCustomEvent<MainzNavigationReadyDetail>(MAINZ_NAVIGATION_READY_EVENT, {
        target: options?.target,
        predicate: (detail) => {
            if (!detail) {
                return false;
            }

            if (options?.mode && detail.mode !== options.mode) {
                return false;
            }

            if (options?.path && detail.path !== options.path) {
                return false;
            }

            if (options?.matchedPath && detail.matchedPath !== options.matchedPath) {
                return false;
            }

            if (options?.locale && detail.locale !== options.locale) {
                return false;
            }

            if (options?.navigationType && detail.navigationType !== options.navigationType) {
                return false;
            }

            if (
                typeof options?.navigationSequence === "number" &&
                detail.navigationSequence !== options.navigationSequence
            ) {
                return false;
            }

            return true;
        },
        message: "Expected navigation ready event.",
    });
}

export async function waitForNextNavigationStart(options?: {
    target?: EventTarget;
    mode?: MainzNavigationStartDetail["mode"];
    path?: string;
    matchedPath?: string;
    locale?: string;
    navigationType?: MainzNavigationStartDetail["navigationType"];
    navigationSequence?: number;
}): Promise<MainzNavigationStartDetail> {
    return await waitForCustomEvent<MainzNavigationStartDetail>(MAINZ_NAVIGATION_START_EVENT, {
        target: options?.target,
        predicate: (detail) => {
            if (!detail) {
                return false;
            }

            if (options?.mode && detail.mode !== options.mode) {
                return false;
            }

            if (options?.path && detail.path !== options.path) {
                return false;
            }

            if (options?.matchedPath && detail.matchedPath !== options.matchedPath) {
                return false;
            }

            if (options?.locale && detail.locale !== options.locale) {
                return false;
            }

            if (options?.navigationType && detail.navigationType !== options.navigationType) {
                return false;
            }

            if (
                typeof options?.navigationSequence === "number" &&
                detail.navigationSequence !== options.navigationSequence
            ) {
                return false;
            }

            return true;
        },
        message: "Expected navigation start event.",
    });
}

export async function waitForNextNavigationError(options?: {
    target?: EventTarget;
    mode?: MainzNavigationErrorDetail["mode"];
    path?: string;
    matchedPath?: string;
    locale?: string;
    navigationType?: MainzNavigationErrorDetail["navigationType"];
    navigationSequence?: number;
    phase?: MainzNavigationErrorDetail["phase"];
}): Promise<MainzNavigationErrorDetail> {
    return await waitForCustomEvent<MainzNavigationErrorDetail>(MAINZ_NAVIGATION_ERROR_EVENT, {
        target: options?.target,
        predicate: (detail) => {
            if (!detail) {
                return false;
            }

            if (options?.mode && detail.mode !== options.mode) {
                return false;
            }

            if (options?.path && detail.path !== options.path) {
                return false;
            }

            if (options?.matchedPath && detail.matchedPath !== options.matchedPath) {
                return false;
            }

            if (options?.locale && detail.locale !== options.locale) {
                return false;
            }

            if (options?.navigationType && detail.navigationType !== options.navigationType) {
                return false;
            }

            if (
                typeof options?.navigationSequence === "number" &&
                detail.navigationSequence !== options.navigationSequence
            ) {
                return false;
            }

            if (options?.phase && detail.phase !== options.phase) {
                return false;
            }

            return true;
        },
        message: "Expected navigation error event.",
    });
}

export async function waitForNextNavigationAbort(options?: {
    target?: EventTarget;
    mode?: MainzNavigationAbortDetail["mode"];
    path?: string;
    matchedPath?: string;
    locale?: string;
    navigationType?: MainzNavigationAbortDetail["navigationType"];
    navigationSequence?: number;
    reason?: MainzNavigationAbortDetail["reason"];
}): Promise<MainzNavigationAbortDetail> {
    return await waitForCustomEvent<MainzNavigationAbortDetail>(MAINZ_NAVIGATION_ABORT_EVENT, {
        target: options?.target,
        predicate: (detail) => {
            if (!detail) {
                return false;
            }

            if (options?.mode && detail.mode !== options.mode) {
                return false;
            }

            if (options?.path && detail.path !== options.path) {
                return false;
            }

            if (options?.matchedPath && detail.matchedPath !== options.matchedPath) {
                return false;
            }

            if (options?.locale && detail.locale !== options.locale) {
                return false;
            }

            if (options?.navigationType && detail.navigationType !== options.navigationType) {
                return false;
            }

            if (
                typeof options?.navigationSequence === "number" &&
                detail.navigationSequence !== options.navigationSequence
            ) {
                return false;
            }

            if (options?.reason && detail.reason !== options.reason) {
                return false;
            }

            return true;
        },
        message: "Expected navigation abort event.",
    });
}

export async function waitForNavigationLifecyclePair(options: {
    target?: EventTarget;
    mode?: MainzNavigationStartDetail["mode"];
    path?: string;
    matchedPath?: string;
    locale?: string;
    navigationType?: MainzNavigationStartDetail["navigationType"];
}): Promise<{
    started: Promise<MainzNavigationStartDetail>;
    ready: Promise<MainzNavigationReadyDetail>;
}> {
    return {
        started: waitForNextNavigationStart({
            target: options.target,
            mode: options.mode,
            path: options.path,
            matchedPath: options.matchedPath,
            locale: options.locale,
            navigationType: options.navigationType,
        }),
        ready: waitForNextNavigationReady({
            target: options.target,
            mode: options.mode,
            path: options.path,
            matchedPath: options.matchedPath,
            locale: options.locale,
            navigationType: options.navigationType,
        }),
    };
}

export function parseCliMatrixCheckArgs(
    scriptName: string,
    args: readonly string[],
): CliTestCombination {
    const [mode, navigation] = args;

    if (!isCliTestRenderMode(mode) || !isCliTestNavigationMode(navigation)) {
        throw new Error(
            `Usage: deno run -A ./tests/helpers/${scriptName} <mode> <navigation>`,
        );
    }

    return {
        mode,
        navigation,
    };
}

export function createBuildContext(args: CliBuildContext): CliBuildContext {
    return { ...args };
}

function isCliTestRenderMode(value: string | undefined): value is CliTestRenderMode {
    return value === "csr" || value === "ssg";
}

function isCliTestNavigationMode(value: string | undefined): value is CliTestNavigationMode {
    return value === "spa" || value === "mpa" || value === "enhanced-mpa";
}

async function fileExists(path: string): Promise<boolean> {
    try {
        await Deno.stat(path);
        return true;
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            return false;
        }

        throw error;
    }
}
