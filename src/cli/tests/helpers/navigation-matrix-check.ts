/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withHappyDom } from "../../../ssg/happy-dom.ts";
import { nextTick, waitFor } from "../../../testing/async-testing.ts";
import {
    type CliTestNavigationMode,
    type CliTestRenderMode,
    cliTestsRepoRoot as repoRoot,
    extractModuleScriptSrc,
    resolveDirectLoadFixture,
    resolveOutputScriptPath,
    runMainzCliCommand,
} from "../test-helpers.ts";

const [mode, navigation] = Deno.args as [("csr" | "ssg")?, ("spa" | "mpa" | "enhanced-mpa")?];

if (!mode || !navigation) {
    throw new Error(
        "Usage: deno run -A ./src/cli/tests/helpers/navigation-matrix-check.ts <mode> <navigation>",
    );
}

await runMainzCliCommand(
    [
        "build",
        "--target",
        "site",
        "--mode",
        mode,
        "--navigation",
        navigation,
    ],
    "Failed to build site for navigation matrix check.",
);

const fixture = await resolveHtmlFixture(mode, navigation);
const scriptSrc = extractModuleScriptSrc(fixture.html);
assert(scriptSrc, `Could not find module script src for ${mode} + ${navigation}.`);

const scriptPath = resolveOutputScriptPath({ outputDir: fixture.outputDir, htmlPath: fixture.htmlPath, scriptSrc });
await Deno.stat(scriptPath);

await withHappyDom(async () => {
    document.write(fixture.html);
    document.close();

    await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-${mode}-${navigation}`);
    await waitFor(() =>
        document.querySelector<HTMLAnchorElement>('.locale-chip[data-locale="pt"]') !== null &&
        document.documentElement.lang === "en"
    );

    assertEquals(document.documentElement.dataset.mainzNavigation, navigation);
    assertStringIncludes(document.body.textContent ?? "", "Start guided journey");

    const localeLink = document.querySelector<HTMLAnchorElement>('.locale-chip[data-locale="pt"]');
    assert(localeLink, "Expected the PT locale switcher link to be rendered.");
    assertEquals(localeLink.getAttribute("href"), "/pt/");

    const initialText = document.body.textContent ?? "";

    localeLink.dispatchEvent(new Event("focusin", { bubbles: true }));
    await nextTick();

    const prefetchHref = document.head.querySelector('link[rel="prefetch"][as="document"]')?.getAttribute("href") ?? null;
    const clickEvent = new window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    const clickResult = localeLink.dispatchEvent(clickEvent);
    await waitForPostClick(navigation);

    if (navigation === "spa") {
        assertEquals(clickResult, false);
        assertEquals(clickEvent.defaultPrevented, true);
        assertEquals(window.location.pathname, "/pt/");
        assertEquals(document.documentElement.lang, "pt");
        assertStringIncludes(document.body.textContent ?? "", "Iniciar trilha guiada");
        assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);
        assertEquals(prefetchHref, null);
        return;
    }

    assertEquals(clickResult, true);
    assertEquals(clickEvent.defaultPrevented, false);
    assertEquals(document.documentElement.lang, "en");
    assertStringIncludes(document.body.textContent ?? "", "Start guided journey");
    assertEquals(document.body.textContent ?? "", initialText);

    if (navigation === "enhanced-mpa") {
        assertEquals(prefetchHref, "https://mainz.local/pt/");
        assertEquals(document.documentElement.dataset.mainzTransitionPhase, "leaving");
        return;
    }

    assertEquals(prefetchHref, null);
    assertEquals(document.documentElement.dataset.mainzTransitionPhase, undefined);
}, { url: fixture.url });

async function resolveHtmlFixture(
    renderMode: CliTestRenderMode,
    navigationMode: CliTestNavigationMode,
): Promise<{ html: string; htmlPath: string; outputDir: string; url: string }> {
    const outputDir = resolve(repoRoot, `dist/site/${renderMode}`);
    return {
        ...(await resolveDirectLoadFixture({
            outputDir,
            renderMode,
            navigationMode,
            documentHtmlPath: "en/index.html",
            url: "https://mainz.local/en/",
        })),
        url: "https://mainz.local/en/",
    };
}

async function waitForPostClick(navigationMode: "spa" | "mpa" | "enhanced-mpa"): Promise<void> {
    if (navigationMode === "spa") {
        await waitFor(() =>
            window.location.pathname === "/pt/" &&
            document.documentElement.lang === "pt" &&
            (document.body.textContent ?? "").includes("Iniciar trilha guiada"),
            `Expected SPA locale switch to land on /pt/. Received pathname=${window.location.pathname}, lang=${document.documentElement.lang}, title=${document.title}.`,
        );
        return;
    }

    await nextTick();
}
