/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { serveBuildArtifactsNode } from "../node-artifact-server.ts";
import { createTestAppTargetConfig } from "../../../tests/helpers/test-app-config.ts";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test("server/node-artifact-server: should serve SSR routes from built server artifacts", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "ssr-build-app",
    targetName: "ssr-build-app",
  });

  let server: Awaited<ReturnType<typeof serveBuildArtifactsNode>> | undefined;

  try {
    await buildTestApp(testApp.configPath, testApp.targetName);
    await Deno.rename(
      resolve(testApp.testAppRoot, "src", "main.tsx"),
      resolve(testApp.testAppRoot, "src", "main.server-disabled.tsx"),
    );

    server = await serveBuildArtifactsNode({
      rootDir: resolve(testApp.artifactRootDir),
      host: "127.0.0.1",
      port: 0,
      onListen: () => {},
    });

    const response = await fetch(`http://127.0.0.1:${server.address.port}/`, {
      headers: {
        "accept": "text/html",
      },
    });
    const html = await response.text();

    assertEquals(response.status, 200);
    assertStringIncludes(html, "SSR Build App");
    assertStringIncludes(html, 'id="mainz-route-snapshot"');
  } finally {
    await server?.close();
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
