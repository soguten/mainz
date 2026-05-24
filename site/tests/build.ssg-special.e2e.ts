/// <reference lib="deno.ns" />

import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createArtifactPreviewHandler } from "../../src/preview/artifact-server.ts";
import { withHappyDom } from "../../src/ssg/happy-dom.ts";
import { nextTick } from "../../src/testing/async-testing.ts";
import { buildTargetWithEngine } from "../../tests/helpers/build.ts";
import { fullSuiteIgnore } from "../../tests/helpers/full-suite.ts";
import {
  extractModuleScriptSrc,
  readJsonFile,
  resolveOutputScriptPath,
} from "../../tests/helpers/built-output-io.ts";
import { cliTestsRepoRoot as repoRoot } from "../../tests/helpers/types.ts";

const siteArtifactRootDir = resolve(repoRoot, "dist/site");
const siteBrowserOutDir = resolve(siteArtifactRootDir, "browser");

Deno.test({
  name:
    "site/ssg output: site app should preserve hydration, preview 404 behavior, and relative SEO",
  ignore: fullSuiteIgnore(),
  async fn(t) {
    await buildSiteSsg();

    await t.step("hydration", async () => {
      const hydrationManifest = await readHydrationManifest();
      assertEquals(hydrationManifest.navigation, "mpa");

      const routeHtmlPath = resolve(siteBrowserOutDir, "index.html");
      const html = await Deno.readTextFile(routeHtmlPath);

      assertStringIncludes(html, "<x-mainz-tutorial-page>");
      assertStringIncludes(html, "Start guided journey");
      assertStringIncludes(html, "Guided journey");

      const scriptSrc = extractModuleScriptSrc(html);
      assert(
        scriptSrc,
        "Could not find module script src in prerendered html.",
      );
      assertStringIncludes(scriptSrc, "./assets/");

      const scriptPath = resolve(dirname(routeHtmlPath), scriptSrc);
      await Deno.stat(scriptPath);

      const ptRouteHtmlPath = resolve(siteBrowserOutDir, "pt/index.html");
      const ptHtml = await Deno.readTextFile(ptRouteHtmlPath);
      assertStringIncludes(ptHtml, "Iniciar trilha guiada");
      assertStringIncludes(ptHtml, "Trilha guiada");
      if (ptHtml.includes("Start guided journey")) {
        throw new Error(
          "Expected /pt/ content to remain in Portuguese, but found English hero CTA.",
        );
      }
      const ptScriptSrc = extractModuleScriptSrc(ptHtml);
      assert(
        ptScriptSrc,
        "Could not find module script src in prerendered /pt/ html.",
      );
      const ptScriptPath = resolve(dirname(ptRouteHtmlPath), ptScriptSrc);
      await Deno.stat(ptScriptPath);

      await withHappyDom(async () => {
        document.write(html);
        document.close();

        assert(
          document.querySelector("#app x-mainz-tutorial-page"),
          "Expected prerendered tutorial root in #app.",
        );

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}`);
        await nextTick();

        assertEquals(
          document.documentElement.dataset.mainzNavigation,
          "mpa",
        );
        assertEquals(
          document.documentElement.dataset.mainzTransitionPhase,
          undefined,
        );
        assert(document.documentElement.dataset.mainzViewTransitions);

        const chapterButtons = Array.from(
          document.querySelectorAll<HTMLButtonElement>(
            ".chapter-row .chapter-button",
          ),
        );
        assert(
          chapterButtons.length >= 2,
          "Expected at least two chapter buttons.",
        );

        const activeBefore = document.querySelector(
          ".chapter-row .chapter-button.active",
        )
          ?.textContent?.trim();
        chapterButtons[1].click();
        await nextTick();
        const activeAfter = document.querySelector(
          ".chapter-row .chapter-button.active",
        )
          ?.textContent?.trim();

        assert(activeBefore, "Expected an active chapter before click.");
        assert(activeAfter, "Expected an active chapter after click.");
        assertNotEquals(activeAfter, activeBefore);
      });

      await withHappyDom(async () => {
        document.write(ptHtml);
        document.close();

        assertStringIncludes(
          document.body.textContent ?? "",
          "Iniciar trilha guiada",
        );

        await import(
          `${pathToFileURL(ptScriptPath).href}?e2e=${Date.now()}-pt`
        );
        await nextTick();

        const hydratedText = document.body.textContent ?? "";
        assertStringIncludes(hydratedText, "Iniciar trilha guiada");

        if (hydratedText.includes("Start guided journey")) {
          throw new Error(
            "Hydration switched /pt/ content to English unexpectedly.",
          );
        }
      }, { url: "https://mainz.local/pt/" });
    });

    await t.step("relative seo", async () => {
      const enHtml = await Deno.readTextFile(
        resolve(siteBrowserOutDir, "index.html"),
      );
      const ptHtml = await Deno.readTextFile(
        resolve(siteBrowserOutDir, "pt/index.html"),
      );

      assertEquals(extractCanonicalHrefs(enHtml), ["/"]);
      assertEquals(extractAlternateLinks(enHtml), [
        { href: "/", hreflang: "en" },
        { href: "/pt/", hreflang: "pt" },
        { href: "/", hreflang: "x-default" },
      ]);

      assertEquals(extractCanonicalHrefs(ptHtml), ["/pt/"]);
      assertEquals(extractAlternateLinks(ptHtml), [
        { href: "/", hreflang: "en" },
        { href: "/pt/", hreflang: "pt" },
        { href: "/", hreflang: "x-default" },
      ]);
    });

    await t.step("404 artifact", async () => {
      const notFoundHtmlPath = resolve(siteBrowserOutDir, "404.html");
      const html = await Deno.readTextFile(notFoundHtmlPath);

      assertStringIncludes(html, "<x-mainz-not-found-page>");
      assertStringIncludes(html, "That route does not exist in Mainz.");

      const scriptSrc = extractModuleScriptSrc(html);
      assert(
        scriptSrc,
        "Could not find module script src in prerendered 404 html.",
      );
      assertStringIncludes(scriptSrc, "/assets/");

      const scriptPath = resolveOutputScriptPath({
        outputDir: siteBrowserOutDir,
        scriptSrc,
      });
      await Deno.stat(scriptPath);

      await withHappyDom(async () => {
        document.write(html);
        document.close();

        assert(document.querySelector("#app x-mainz-not-found-page"));

        await import(`${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-404`);
        await nextTick();

        assertEquals(
          document.documentElement.dataset.mainzNavigation,
          "mpa",
        );
        assertStringIncludes(
          document.body.textContent ?? "",
          "That route does not exist in Mainz.",
        );
      }, { url: "https://mainz.local/missing/route" });
    });

    await t.step("preview missing route", async () => {
      const handler = createArtifactPreviewHandler(
        siteArtifactRootDir,
      );
      const response = await handler(new Request("http://127.0.0.1:4173/bba/"));
      const html = await response.text();

      assertEquals(response.status, 404);
      assertStringIncludes(html, "<title>404 | Mainz</title>");
      assertStringIncludes(
        html,
        'content="Mainz page not found experience for static and enhanced MPA navigation."',
      );
      assertStringIncludes(html, "That route does not exist in Mainz.");
    });

    await t.step("preview localized missing route", async () => {
      const handler = createArtifactPreviewHandler(
        siteArtifactRootDir,
      );
      const response = await handler(
        new Request("http://127.0.0.1:4173/pt/dfdfhsdfsdf"),
      );
      const html = await response.text();

      assertEquals(response.status, 404);
      assertStringIncludes(html, "<title>404 | Mainz</title>");

      const scriptSrc = extractModuleScriptSrc(html);
      assert(
        scriptSrc,
        "Could not find module script src in localized prerendered 404 html.",
      );
      const scriptPath = resolveOutputScriptPath({
        outputDir: siteBrowserOutDir,
        scriptSrc,
      });
      await Deno.stat(scriptPath);

      await withHappyDom(async () => {
        document.write(html);
        document.close();

        await import(
          `${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-ssg-404-pt`
        );
        await nextTick();

        assertEquals(document.documentElement.lang, "pt");
        assertStringIncludes(
          document.body.textContent ?? "",
          "Essa rota nao existe no Mainz.",
        );
      }, { url: "https://mainz.local/pt/dfdfhsdfsdf" });
    });
  },
});

Deno.test({
  name:
    "site/gh-pages: site app should emit absolute SEO links while preserving hydration",
  ignore: fullSuiteIgnore(),
  async fn(t) {
    await buildSiteGhPages();

    await t.step("absolute seo", async () => {
      const enHtml = await Deno.readTextFile(
        resolve(siteBrowserOutDir, "index.html"),
      );
      const ptHtml = await Deno.readTextFile(
        resolve(siteBrowserOutDir, "pt/index.html"),
      );

      assertEquals(extractCanonicalHrefs(enHtml), ["https://mainz.dev/"]);
      assertEquals(extractAlternateLinks(enHtml), [
        { href: "https://mainz.dev/", hreflang: "en" },
        { href: "https://mainz.dev/pt/", hreflang: "pt" },
        { href: "https://mainz.dev/", hreflang: "x-default" },
      ]);

      assertEquals(extractCanonicalHrefs(ptHtml), ["https://mainz.dev/pt/"]);
      assertEquals(extractAlternateLinks(ptHtml), [
        { href: "https://mainz.dev/", hreflang: "en" },
        { href: "https://mainz.dev/pt/", hreflang: "pt" },
        { href: "https://mainz.dev/", hreflang: "x-default" },
      ]);
    });

    await t.step("hydration", async () => {
      const ptRouteHtmlPath = resolve(siteBrowserOutDir, "pt/index.html");
      const ptHtml = await Deno.readTextFile(ptRouteHtmlPath);

      assertStringIncludes(ptHtml, "Iniciar trilha guiada");
      const ptScriptSrc = extractModuleScriptSrc(ptHtml);
      assert(
        ptScriptSrc,
        "Could not find module script src in publish-profile /pt/ html.",
      );
      assertStringIncludes(ptScriptSrc, "../assets/");

      const ptScriptPath = resolve(dirname(ptRouteHtmlPath), ptScriptSrc);
      await Deno.stat(ptScriptPath);

      await withHappyDom(async () => {
        document.write(ptHtml);
        document.close();

        assertStringIncludes(
          document.body.textContent ?? "",
          "Iniciar trilha guiada",
        );

        await import(
          `${pathToFileURL(ptScriptPath).href}?e2e=${Date.now()}-publish-pt`
        );
        await nextTick();

        const hydratedText = document.body.textContent ?? "";
        assertStringIncludes(hydratedText, "Iniciar trilha guiada");

        if (hydratedText.includes("Start guided journey")) {
          throw new Error(
            "Hydration switched /pt/ content to English unexpectedly.",
          );
        }
      }, { url: "https://mainz.local/pt/" });
    });
  },
});

Deno.test({
  name:
    "site/plain-static: site app should force MPA runtime without enhanced hooks",
  ignore: fullSuiteIgnore(),
  async fn() {
    await buildSitePlainStatic();

    const hydrationManifest = await readHydrationManifest();
    assertEquals(hydrationManifest.navigation, "mpa");

    const routeHtmlPath = resolve(siteBrowserOutDir, "index.html");
    const html = await Deno.readTextFile(routeHtmlPath);
    const scriptSrc = extractModuleScriptSrc(html);
    assert(
      scriptSrc,
      "Could not find module script src in prerendered plain-static html.",
    );

    const scriptPath = resolve(dirname(routeHtmlPath), scriptSrc);
    await Deno.stat(scriptPath);

    await withHappyDom(async () => {
      document.write(html);
      document.close();

      await import(
        `${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-plain-static`
      );
      await nextTick();

      assertEquals(document.documentElement.dataset.mainzNavigation, "mpa");
      assertEquals(
        document.documentElement.dataset.mainzTransitionPhase,
        undefined,
      );
      assertEquals(
        document.documentElement.dataset.mainzViewTransitions,
        "fallback",
      );
    }, { url: "https://mainz.local/en/" });
  },
});

async function buildSiteSsg(): Promise<void> {
  await buildTargetWithEngine({
    targetName: "site",
  });
}

async function buildSiteGhPages(): Promise<void> {
  await buildTargetWithEngine({
    targetName: "site",
    profile: "gh-pages",
  });
}

async function buildSitePlainStatic(): Promise<void> {
  await buildTargetWithEngine({
    targetName: "site",
    profile: "plain-static",
  });
}

async function readHydrationManifest(): Promise<
  { target: string; hydration: string; navigation: string }
> {
  const hydrationManifestPath = resolve(
    repoRoot,
    "dist/site/browser/hydration.json",
  );
  return await readJsonFile(hydrationManifestPath);
}

function extractCanonicalHrefs(html: string): string[] {
  return Array.from(
    html.matchAll(
      /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
    ),
    (match) => match[1],
  );
}

function extractAlternateLinks(
  html: string,
): Array<{ href: string; hreflang: string }> {
  return Array.from(
    html.matchAll(
      /<link\s+[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*hreflang=["']([^"']+)["'][^>]*\/?>/gi,
    ),
    (match) => ({
      href: match[1],
      hreflang: match[2],
    }),
  );
}
