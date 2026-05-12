/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { serveBuildArtifacts } from "../artifact-server.ts";
import { createTestAppTargetConfig } from "../../../tests/helpers/test-app-config.ts";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test("server/artifact-server: should serve SSR routes from built server artifacts", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "ssr-build-app",
    targetName: "ssr-build-app",
  });

  let server: Deno.HttpServer<Deno.NetAddr> | undefined;

  try {
    await buildTestApp(testApp.configPath, testApp.targetName);
    await Deno.rename(
      resolve(testApp.testAppRoot, "src", "main.tsx"),
      resolve(testApp.testAppRoot, "src", "main.server-disabled.tsx"),
    );

    server = serveBuildArtifacts({
      rootDir: resolve(testApp.artifactRootDir),
      host: "127.0.0.1",
      port: 0,
      onListen: () => {},
    });

    const response = await fetch(`http://127.0.0.1:${server.addr.port}/`, {
      headers: {
        "accept": "text/html",
      },
    });
    const html = await response.text();

    assertEquals(response.status, 200);
    assertStringIncludes(html, "SSR Build App");
    assertStringIncludes(html, 'id="mainz-route-snapshot"');
  } finally {
    if (server) {
      await server.shutdown();
      await server.finished;
    }
    await testApp.cleanup();
  }
});

Deno.test("server/artifact-server: should serve browser shell when no SSR manifest exists", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "entries-di-build",
    targetName: "entries-di-build",
  });

  let server: Deno.HttpServer<Deno.NetAddr> | undefined;

  try {
    await buildTestApp(testApp.configPath, testApp.targetName);

    server = serveBuildArtifacts({
      rootDir: resolve(testApp.artifactRootDir),
      host: "127.0.0.1",
      port: 0,
      onListen: () => {},
    });

    const response = await fetch(`http://127.0.0.1:${server.addr.port}/`, {
      headers: {
        "accept": "text/html",
      },
    });
    const html = await response.text();
    const shellHtml = await Deno.readTextFile(
      resolve(testApp.outputDir, "index.html"),
    );

    assertEquals(response.status, 200);
    assertEquals(html, shellHtml);
  } finally {
    if (server) {
      await server.shutdown();
      await server.finished;
    }
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
