/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { tryRenderSsrArtifactRequest } from "../ssr-artifact-handler.ts";
import { createTestAppTargetConfig } from "../../../tests/helpers/test-app-config.ts";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test("build/ssr-artifact-handler: should render built ssr artifacts without importing the source app entry", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "ssr-build-app",
    targetName: "ssr-build-app",
  });

  try {
    await buildTestApp(testApp.configPath, testApp.targetName);
    await Deno.rename(
      resolve(testApp.testAppRoot, "src", "main.tsx"),
      resolve(testApp.testAppRoot, "src", "main.disabled.tsx"),
    );

    const response = await tryRenderSsrArtifactRequest({
      rootDir: resolve(testApp.artifactRootDir),
      browserRootDir: resolve(testApp.outputDir),
      request: new Request("http://127.0.0.1:4173/"),
    });
    const html = await response?.text();

    assertEquals(response?.status, 200);
    assertStringIncludes(html ?? "", "SSR Build App");
    assertStringIncludes(html ?? "", 'id="mainz-route-snapshot"');
    assertStringIncludes(html ?? "", 'id="mainz-route-generation"');
    assertStringIncludes(html ?? "", '"documentRenderMode":"ssr"');
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("build/ssr-artifact-handler: should return null when no built ssr manifest exists", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "entries-di-build",
    targetName: "entries-di-build",
  });

  try {
    await buildTestApp(testApp.configPath, testApp.targetName);

    const response = await tryRenderSsrArtifactRequest({
      rootDir: resolve(testApp.artifactRootDir),
      browserRootDir: resolve(testApp.outputDir),
      request: new Request("http://127.0.0.1:4173/"),
    });

    assertEquals(response, null);
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
