/// <reference lib="deno.ns" />

import { dirname, join, resolve } from "node:path";
import {
  assertEquals,
  assertStringIncludes,
} from "@std/assert";
import { tryRenderSsrArtifactRequest } from "../ssr-artifact-handler.ts";
import { createTestAppTargetConfig } from "../../../tests/helpers/test-app-config.ts";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test("build/public-assets: should publish default public files and reference them in csr, ssg, and ssr output", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "public-assets-routed-app",
    targetName: "public-assets-routed-app",
  });

  try {
    await buildTestApp(testApp.configPath, testApp.targetName);

    const browserRoot = resolve(testApp.outputDir);
    const csrHtml = await Deno.readTextFile(join(browserRoot, "csr", "index.html"));
    const ssgHtml = await Deno.readTextFile(join(browserRoot, "ssg", "index.html"));
    const publishedScript = await Deno.readTextFile(
      join(browserRoot, "assets", "docs-search.js"),
    );
    const publishedFont = await Deno.readTextFile(
      join(browserRoot, "assets", "fonts", "brand.woff2"),
    );

    assertStringIncludes(csrHtml, 'href="/assets/fonts/brand.woff2"');
    assertStringIncludes(csrHtml, 'src="/assets/docs-search.js"');
    assertStringIncludes(ssgHtml, 'href="/assets/fonts/brand.woff2"');
    assertStringIncludes(ssgHtml, 'src="/assets/docs-search.js"');
    assertStringIncludes(publishedScript, "__PUBLIC_DOCS_SEARCH__");
    assertStringIncludes(publishedFont, "PUBLIC-BRAND-FONT");

    const ssrResponse = await tryRenderSsrArtifactRequest({
      rootDir: resolve(testApp.artifactRootDir),
      browserRootDir: browserRoot,
      request: new Request("http://127.0.0.1:4173/ssr", {
        headers: { accept: "text/html" },
      }),
    });
    const ssrHtml = await ssrResponse?.text();

    assertEquals(ssrResponse?.status, 200);
    assertStringIncludes(ssrHtml ?? "", 'href="/assets/fonts/brand.woff2"');
    assertStringIncludes(ssrHtml ?? "", 'src="/assets/docs-search.js"');
  } finally {
    await testApp.cleanup();
  }
});

async function buildTestApp(
  configPath: string,
  targetName: string,
): Promise<void> {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      "./src/cli/mainz.ts",
      "build",
      "--config",
      configPath,
      "--target",
      targetName,
    ],
    cwd: cliTestsRepoRoot,
    stdout: "piped",
    stderr: "piped",
  });
  const result = await command.output();
  if (!result.success) {
    const stdout = new TextDecoder().decode(result.stdout);
    const stderr = new TextDecoder().decode(result.stderr);
    throw new Error(`build failed\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  }
}
