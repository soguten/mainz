/// <reference lib="deno.ns" />

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createArtifactPreviewHandler } from "../../../src/preview/artifact-server.ts";
import { withHappyDom } from "../../../src/ssg/happy-dom.ts";
import { nextTick } from "../../../src/testing/async-testing.ts";
import { buildTargetWithEngine } from "../../helpers/build.ts";
import {
  extractModuleScriptSrc,
  readJsonFile,
  resolveOutputScriptPath,
} from "../../helpers/fixture-io.ts";
import { cliTestsRepoRoot as repoRoot } from "../../helpers/types.ts";

Deno.test("e2e/csr routing: enhanced-mpa build should emit localized route shells and hydrate direct document loads", async () => {
  await buildSiteCsrEnhancedMpa();

  const hydrationManifest = await readHydrationManifest();
  assertEquals(hydrationManifest.navigation, "enhanced-mpa");

  const rootHtmlPath = resolve(repoRoot, "dist/site/csr/index.html");
  const rootHtml = await Deno.readTextFile(rootHtmlPath);
  assertStringIncludes(rootHtml, '<html lang="en">');

  const ptRouteHtmlPath = resolve(repoRoot, "dist/site/csr/pt/index.html");
  const ptHtml = await Deno.readTextFile(ptRouteHtmlPath);
  assertStringIncludes(ptHtml, '<html lang="pt">');
  assertStringIncludes(ptHtml, "<title>Mainz</title>");

  const scriptSrc = extractModuleScriptSrc(ptHtml);
  assert(scriptSrc, "Could not find module script src in CSR /pt/ html.");
  assertStringIncludes(scriptSrc, "../assets/");

  const scriptPath = resolve(dirname(ptRouteHtmlPath), scriptSrc);
  await Deno.stat(scriptPath);

  await withHappyDom(async () => {
    document.write(ptHtml);
    document.close();

    assertEquals(document.querySelector("#app")?.innerHTML, "");

    await import(
      `${pathToFileURL(scriptPath).href}?e2e=${Date.now()}-csr-mpa-pt`
    );
    await nextTick();

    assertEquals(
      document.documentElement.dataset.mainzNavigation,
      "enhanced-mpa",
    );
    assertStringIncludes(
      document.body.textContent ?? "",
      "Iniciar trilha guiada",
    );
  }, { url: "https://mainz.local/pt/" });
});

Deno.test("e2e/csr preview: enhanced-mpa build should serve localized routes and custom 404 page", async () => {
  await buildSiteCsrEnhancedMpa();

  const handler = createArtifactPreviewHandler(
    resolve(repoRoot, "dist/site/csr"),
  );

  const enResponse = await handler(new Request("http://127.0.0.1:4173/"));
  const enHtml = await enResponse.text();
  assertEquals(enResponse.status, 200);
  assertStringIncludes(enHtml, '<html lang="en">');

  const ptResponse = await handler(new Request("http://127.0.0.1:4173/pt/"));
  const ptHtml = await ptResponse.text();
  assertEquals(ptResponse.status, 200);
  assertStringIncludes(ptHtml, '<html lang="pt">');

  const notFoundResponse = await handler(
    new Request("http://127.0.0.1:4173/enadasd"),
  );
  const notFoundHtml = await notFoundResponse.text();
  assertEquals(notFoundResponse.status, 404);
  assertStringIncludes(notFoundHtml, "<title>404 | Mainz</title>");

  const notFoundScriptSrc = extractModuleScriptSrc(notFoundHtml);
  assert(
    notFoundScriptSrc,
    "Could not find module script src in CSR 404 html.",
  );
  const notFoundScriptPath = resolveOutputScriptPath({
    outputDir: resolve(repoRoot, "dist/site/csr"),
    scriptSrc: notFoundScriptSrc,
  });

  await withHappyDom(async () => {
    document.write(notFoundHtml);
    document.close();

    await import(
      `${pathToFileURL(notFoundScriptPath).href}?e2e=${Date.now()}-csr-mpa-404`
    );
    await nextTick();

    assertEquals(
      document.documentElement.dataset.mainzNavigation,
      "enhanced-mpa",
    );
    assertStringIncludes(
      document.body.textContent ?? "",
      "That route does not exist in Mainz.",
    );
  }, { url: "https://mainz.local/enadasd" });

  const localizedNotFoundResponse = await handler(
    new Request("http://127.0.0.1:4173/pt/dfdfhsdfsdf"),
  );
  const localizedNotFoundHtml = await localizedNotFoundResponse.text();
  assertEquals(localizedNotFoundResponse.status, 404);
  assertStringIncludes(localizedNotFoundHtml, "<title>404 | Mainz</title>");

  const localizedNotFoundScriptSrc = extractModuleScriptSrc(
    localizedNotFoundHtml,
  );
  assert(
    localizedNotFoundScriptSrc,
    "Could not find module script src in localized CSR 404 html.",
  );
  const localizedNotFoundScriptPath = resolveOutputScriptPath({
    outputDir: resolve(repoRoot, "dist/site/csr"),
    scriptSrc: localizedNotFoundScriptSrc,
  });

  await withHappyDom(async () => {
    document.write(localizedNotFoundHtml);
    document.close();

    await import(
      `${
        pathToFileURL(localizedNotFoundScriptPath).href
      }?e2e=${Date.now()}-csr-mpa-404-pt`
    );
    await nextTick();

    assertEquals(document.documentElement.lang, "pt");
    assertStringIncludes(
      document.body.textContent ?? "",
      "Essa rota nao existe no Mainz.",
    );
  }, { url: "https://mainz.local/pt/dfdfhsdfsdf" });
});

async function buildSiteCsrEnhancedMpa(): Promise<void> {
  await buildTargetWithEngine({
    targetName: "site",
    mode: "csr",
  });
}

async function readHydrationManifest(): Promise<
  { target: string; hydration: string; navigation: string }
> {
  const hydrationManifestPath = resolve(
    repoRoot,
    "dist/site/csr/hydration.json",
  );
  return await readJsonFile(hydrationManifestPath);
}
