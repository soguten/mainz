/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withHappyDom } from "../../../ssg/happy-dom.ts";

const decoder = new TextDecoder();
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const matrixBasePath = "/docs/mainz/";
const matrixSiteUrl = "https://example.com/docs/mainz";

const [mode, navigation] = Deno.args as [("csr" | "ssg")?, ("spa" | "mpa" | "enhanced-mpa")?];

if (!mode || !navigation) {
    throw new Error(
        "Usage: deno run -A ./src/cli/tests/helpers/base-path-matrix-check.ts <mode> <navigation>",
    );
}

const testRoot = await Deno.makeTempDir({ dir: repoRoot, prefix: ".mainz-base-path-matrix-" });

try {
    const { configPath, outputDir } = await writeMatrixConfig(testRoot);

    await runBuildCommand([
        "build",
        "--config",
        configPath,
        "--target",
        "site",
        "--profile",
        "gh-pages",
        "--mode",
        mode,
        "--navigation",
        navigation,
    ]);

    await assertLocalizedHomeRoute({
        mode,
        navigation,
        outputDir,
    });

    await assertLocalizedNotFoundRoute({
        mode,
        navigation,
        outputDir,
    });
} finally {
    await Deno.remove(testRoot, { recursive: true }).catch(() => undefined);
}

async function assertLocalizedHomeRoute(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    outputDir: string;
}): Promise<void> {
    const modeOutputDir = resolve(args.outputDir, args.mode);
    const fixture = await resolveHomeFixture(modeOutputDir, args.mode, args.navigation);
    const scriptSrc = extractModuleScriptSrc(fixture.html);
    assert(scriptSrc, `Could not find module script src for localized home route (${args.mode} + ${args.navigation}).`);

    const scriptPath = resolveOutputScriptPath(modeOutputDir, fixture.htmlPath, scriptSrc, matrixBasePath);
    await Deno.stat(scriptPath);

    await withHappyDom(async () => {
        document.write(fixture.html);
        document.close();

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${args.mode}-${args.navigation}-home`);
        await waitFor(() =>
            document.querySelector<HTMLAnchorElement>('.locale-chip[data-locale="pt"]') !== null &&
            document.documentElement.lang === "en"
        );

        assertEquals(document.documentElement.dataset.mainzNavigation, args.navigation);
        assertEquals(window.location.pathname, `${matrixBasePath}en/`);
        assertEquals(document.documentElement.lang, "en");
        assertStringIncludes(document.body.textContent ?? "", "Start guided journey");
        assertEquals(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"), `${matrixSiteUrl}/en/`);
        assertEquals(readAlternateHref("pt"), `${matrixSiteUrl}/pt/`);

        const localeLink = document.querySelector<HTMLAnchorElement>('.locale-chip[data-locale="pt"]');
        assert(localeLink, "Expected the PT locale switcher link to exist under a basePath.");
        assertEquals(localeLink.getAttribute("href"), `${matrixBasePath}pt/`);

        localeLink.dispatchEvent(new Event("focusin", { bubbles: true }));
        await nextTick();

        const prefetchHref = document.head.querySelector('link[rel="prefetch"][as="document"]')?.getAttribute("href") ?? null;
        const clickEvent = new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
        const clickResult = localeLink.dispatchEvent(clickEvent);
        await waitForHomeClick(args.navigation);

        if (args.navigation === "spa") {
            assertEquals(clickResult, false);
            assertEquals(clickEvent.defaultPrevented, true);
            assertEquals(window.location.pathname, `${matrixBasePath}pt/`);
            assertEquals(document.documentElement.lang, "pt");
            assertStringIncludes(document.body.textContent ?? "", "Iniciar trilha guiada");
            assertEquals(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"), `${matrixSiteUrl}/pt/`);
            assertEquals(prefetchHref, null);
            assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);
            return;
        }

        assertEquals(clickResult, true);
        assertEquals(clickEvent.defaultPrevented, false);
        assertEquals(window.location.pathname, `${matrixBasePath}pt/`);
        assertEquals(document.documentElement.lang, "en");
        assertStringIncludes(document.body.textContent ?? "", "Start guided journey");

        if (args.navigation === "enhanced-mpa") {
            assertEquals(prefetchHref, `https://mainz.local${matrixBasePath}pt/`);
            assertEquals(document.documentElement.dataset.mainzTransitionPhase, "leaving");
            return;
        }

        assertEquals(prefetchHref, null);
        assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);
    }, { url: `${matrixSiteUrl.replace("https://example.com", "https://mainz.local")}/en/` });
}

async function assertLocalizedNotFoundRoute(args: {
    mode: "csr" | "ssg";
    navigation: "spa" | "mpa" | "enhanced-mpa";
    outputDir: string;
}): Promise<void> {
    const modeOutputDir = resolve(args.outputDir, args.mode);
    const fixture = await resolveNotFoundFixture(modeOutputDir, args.mode, args.navigation);
    const scriptSrc = extractModuleScriptSrc(fixture.html);
    assert(scriptSrc, `Could not find module script src for localized notFound route (${args.mode} + ${args.navigation}).`);

    const scriptPath = resolveOutputScriptPath(modeOutputDir, fixture.htmlPath, scriptSrc, matrixBasePath);
    await Deno.stat(scriptPath);

    await withHappyDom(async () => {
        document.write(fixture.html);
        document.close();

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${args.mode}-${args.navigation}-404`);
        await waitFor(() =>
            document.querySelector<HTMLAnchorElement>('.locale-chip[data-locale="en"]') !== null &&
            document.documentElement.lang === "pt"
        );

        assertEquals(document.documentElement.dataset.mainzNavigation, args.navigation);
        assertEquals(document.documentElement.lang, "pt");
        assertStringIncludes(document.body.textContent ?? "", "Essa rota nao existe no Mainz.");

        const localeLink = document.querySelector<HTMLAnchorElement>('.locale-chip[data-locale="en"]');
        assert(localeLink, "Expected the EN locale switcher link to exist on the localized 404 page.");
        assertEquals(localeLink.getAttribute("href"), `${matrixBasePath}en/nao-existe`);

        assertEquals(
            document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"),
            `${matrixSiteUrl}/pt/nao-existe`,
        );
        assertEquals(readAlternateHref("en"), `${matrixSiteUrl}/en/nao-existe`);
        assertEquals(readAlternateHref("pt"), `${matrixSiteUrl}/pt/nao-existe`);
    }, { url: `${matrixSiteUrl.replace("https://example.com", "https://mainz.local")}/pt/nao-existe` });
}

async function resolveHomeFixture(
    outputDir: string,
    renderMode: "csr" | "ssg",
    navigationMode: "spa" | "mpa" | "enhanced-mpa",
): Promise<{ html: string; htmlPath: string }> {
    if (renderMode === "csr" && navigationMode === "spa") {
        const htmlPath = resolve(outputDir, "index.html");
        return {
            html: await Deno.readTextFile(htmlPath),
            htmlPath,
        };
    }

    const htmlPath = resolve(outputDir, "en", "index.html");
    return {
        html: await Deno.readTextFile(htmlPath),
        htmlPath,
    };
}

async function resolveNotFoundFixture(
    outputDir: string,
    renderMode: "csr" | "ssg",
    navigationMode: "spa" | "mpa" | "enhanced-mpa",
): Promise<{ html: string; htmlPath: string }> {
    if (renderMode === "csr" && navigationMode === "spa") {
        const htmlPath = resolve(outputDir, "index.html");
        return {
            html: await Deno.readTextFile(htmlPath),
            htmlPath,
        };
    }

    const htmlPath = resolve(outputDir, "404.html");
    return {
        html: await Deno.readTextFile(htmlPath),
        htmlPath,
    };
}

async function writeMatrixConfig(rootDir: string): Promise<{ configPath: string; outputDir: string }> {
    const outputDir = resolve(rootDir, "dist", "site");
    const relativeOutputDir = relative(repoRoot, outputDir).replaceAll("\\", "/");
    const buildConfigPath = resolve(rootDir, "site.gh-pages.build.ts");
    const configPath = resolve(rootDir, "mainz.base-path.config.ts");
    const siteRootDir = resolve(repoRoot, "site");
    const sitePagesDir = resolve(repoRoot, "site", "src", "pages");
    const siteViteConfig = resolve(repoRoot, "vite.config.site.ts");

    await Deno.writeTextFile(buildConfigPath, [
        "export default {",
        "  profiles: {",
        "    \"gh-pages\": {",
        `      basePath: ${JSON.stringify(matrixBasePath)},`,
        `      siteUrl: ${JSON.stringify(matrixSiteUrl)}`,
        "    }",
        "  }",
        "};",
        "",
    ].join("\n"));

    await Deno.writeTextFile(configPath, [
        "export default {",
        "  targets: [",
        "    {",
        '      name: "site",',
        `      rootDir: ${JSON.stringify(siteRootDir)},`,
        `      viteConfig: ${JSON.stringify(siteViteConfig)},`,
        `      pagesDir: ${JSON.stringify(sitePagesDir)},`,
        `      buildConfig: ${JSON.stringify(buildConfigPath)},`,
        `      outDir: ${JSON.stringify(relativeOutputDir)},`,
        '      locales: ["en", "pt"],',
        "      i18n: {",
        '        defaultLocale: "en",',
        '        localePrefix: "auto",',
        '        fallbackLocale: "en"',
        "      },",
        '      defaultMode: "ssg",',
        '      defaultNavigation: "enhanced-mpa"',
        "    }",
        "  ],",
        "  render: {",
        '    modes: ["csr", "ssg"]',
        "  }",
        "};",
        "",
    ].join("\n"));

    return {
        configPath,
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
    throw new Error(`Failed to build site for basePath matrix check.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
}

function extractModuleScriptSrc(html: string): string | null {
    const match = html.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/i);
    return match?.[1] ?? null;
}

function resolveOutputScriptPath(outputDir: string, htmlPath: string, scriptSrc: string, basePath: string): string {
    if (scriptSrc.startsWith("/")) {
        const normalizedBasePath = basePath.replace(/\/+$/, "/");
        const sourceWithoutBasePath = scriptSrc.startsWith(normalizedBasePath)
            ? scriptSrc.slice(normalizedBasePath.length - 1)
            : scriptSrc;
        return resolve(outputDir, `.${sourceWithoutBasePath}`);
    }

    return resolve(dirname(htmlPath), scriptSrc);
}

function readAlternateHref(hreflang: string): string | null {
    return document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)?.getAttribute("href") ?? null;
}

async function waitFor(
    predicate: () => boolean,
    message = "Expected condition to become true.",
): Promise<void> {
    for (let attempt = 0; attempt < 25; attempt += 1) {
        if (predicate()) {
            return;
        }

        await nextTick();
    }

    throw new Error(message);
}

async function waitForHomeClick(navigationMode: "spa" | "mpa" | "enhanced-mpa"): Promise<void> {
    if (navigationMode === "spa") {
        await waitFor(() =>
            window.location.pathname === `${matrixBasePath}pt/` &&
            document.documentElement.lang === "pt" &&
            (document.body.textContent ?? "").includes("Iniciar trilha guiada"),
            `Expected SPA locale switch under basePath to land on ${matrixBasePath}pt/. Received pathname=${window.location.pathname}, lang=${document.documentElement.lang}.`,
        );
        return;
    }

    await nextTick();
}

async function nextTick(): Promise<void> {
    await Promise.resolve();
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
}
