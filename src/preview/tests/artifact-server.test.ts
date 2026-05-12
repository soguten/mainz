/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { createArtifactPreviewHandler } from "../artifact-server.ts";
import { createTestAppTargetConfig } from "../../../tests/helpers/test-app-config.ts";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test("preview/artifact-server: should render ssr routes from runtime artifacts instead of serving the csr shell", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "ssr-build-app",
    targetName: "ssr-build-app",
  });

  try {
    const command = new Deno.Command("deno", {
      args: [
        "run",
        "-A",
        "./src/cli/mainz.ts",
        "build",
        "--config",
        testApp.configPath,
        "--target",
        testApp.targetName,
      ],
      cwd: cliTestsRepoRoot,
      stdout: "piped",
      stderr: "piped",
    });
    const result = await command.output();
    if (!result.success) {
      const stdout = new TextDecoder().decode(result.stdout);
      const stderr = new TextDecoder().decode(result.stderr);
      throw new Error(`preview build failed\nstdout:\n${stdout}\nstderr:\n${stderr}`);
    }

    await Deno.rename(
      resolve(testApp.testAppRoot, "src", "main.tsx"),
      resolve(testApp.testAppRoot, "src", "main.preview-disabled.tsx"),
    );

    const handler = createArtifactPreviewHandler(
      resolve(testApp.artifactRootDir),
    );
    const response = await handler(
      new Request("http://127.0.0.1:4173/"),
    );
    const html = await response.text();

    assertEquals(response.status, 200);
    assertEquals(response.headers.get("x-mainz-preview-render-mode"), "ssr");
    assertStringIncludes(html, "SSR Build App");
    assertStringIncludes(html, 'id="mainz-route-snapshot"');

    const shellHtml = await Deno.readTextFile(
      resolve(testApp.outputDir, "index.html"),
    );
    assertEquals(shellHtml.includes("<main>SSR Build App</main>"), false);
  } finally {
    await testApp.cleanup();
  }
});
