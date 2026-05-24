/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { createBuildArtifactHandler } from "../artifact-handler.ts";
import { createArtifactFixture } from "../../../tests/helpers/artifact-fixture.ts";
import { createTestAppTargetConfig } from "../../../tests/helpers/test-app-config.ts";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test({
  name:
    "build/artifact-handler: should render built ssr routes without falling back to the browser shell",
  async fn() {
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

      const handler = createBuildArtifactHandler({
        rootDir: resolve(testApp.artifactRootDir),
      });
      const response = await handler(
        new Request("http://127.0.0.1:4173/", {
          headers: {
            "accept": "text/html",
          },
        }),
      );
      const html = await response.text();

      assertEquals(response.status, 200);
      assertStringIncludes(html, "SSR Build App");
      assertStringIncludes(html, 'id="mainz-route-snapshot"');
    } finally {
      await testApp.cleanup();
    }
  },
});

Deno.test({
  name:
    "build/artifact-handler: should serve browser artifacts when no built ssr manifest exists",
  async fn() {
    const testApp = await createTestAppTargetConfig({
      testAppName: "entries-di-build",
      targetName: "entries-di-build",
    });

    try {
      await buildTestApp(testApp.configPath, testApp.targetName);

      const handler = createBuildArtifactHandler({
        rootDir: resolve(testApp.artifactRootDir),
      });
      const response = await handler(
        new Request("http://127.0.0.1:4173/", {
          headers: {
            "accept": "text/html",
          },
        }),
      );
      const html = await response.text();
      const shellHtml = await Deno.readTextFile(
        resolve(testApp.outputDir, "index.html"),
      );

      assertEquals(response.status, 200);
      assertEquals(html, shellHtml);
    } finally {
      await testApp.cleanup();
    }
  },
});

Deno.test("build/artifact-handler: should prefer browser csr routes over ssr notFound artifacts", async () => {
  const fixture = await createArtifactFixture({
    routes: [{ path: "/", mode: "csr" }],
    notFoundMode: "ssr",
  });

  try {
    const handler = createBuildArtifactHandler({ rootDir: fixture.rootDir });
    const response = await handler(
      new Request("http://127.0.0.1:4173/", {
        headers: {
          "accept": "text/html",
        },
      }),
    );
    const html = await response.text();

    assertEquals(response.status, 200);
    assertEquals(
      html,
      await Deno.readTextFile(
        resolve(fixture.rootDir, "browser", "index.html"),
      ),
    );
    assertEquals(response.headers.get("x-mainz-preview-render-mode"), null);
  } finally {
    await fixture.cleanup();
  }
});

Deno.test("build/artifact-handler: should support 404 routes in csr, ssg, and ssr modes", async (t) => {
  for (const notFoundMode of ["csr", "ssg", "ssr"] as const) {
    await t.step(notFoundMode, async () => {
      const fixture = await createArtifactFixture({
        routes: [{ path: "/", mode: "csr" }],
        notFoundMode,
      });

      try {
        const handler = createBuildArtifactHandler({
          rootDir: fixture.rootDir,
        });
        const response = await handler(
          new Request("http://127.0.0.1:4173/missing", {
            headers: { "accept": "text/html" },
          }),
        );
        const html = await response.text();

        assertEquals(response.status, 404);
        assertStringIncludes(html, fixture.expectedNotFoundMarker);
      } finally {
        await fixture.cleanup();
      }
    });
  }
});

Deno.test("build/artifact-handler: should support mixed csr, ssg, and ssr conventional routes in one app", async () => {
  const fixture = await createArtifactFixture({
    routes: [
      { path: "/", mode: "csr" },
      { path: "/docs", mode: "ssg" },
      { path: "/account", mode: "ssr" },
    ],
    notFoundMode: "csr",
  });

  try {
    const handler = createBuildArtifactHandler({ rootDir: fixture.rootDir });
    const cases = [
      { path: "/", status: 200 },
      { path: "/docs", status: 200 },
      { path: "/account", status: 200 },
      { path: "/missing", status: 404, marker: fixture.expectedNotFoundMarker },
    ];

    for (const testCase of cases) {
      const response = await handler(
        new Request(`http://127.0.0.1:4173${testCase.path}`, {
          headers: { "accept": "text/html" },
        }),
      );
      const html = await response.text();

      assertEquals(response.status, testCase.status);
      assertStringIncludes(
        html,
        testCase.marker ?? fixture.expectedRouteMarkers.get(testCase.path)!,
      );
    }
  } finally {
    await fixture.cleanup();
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
