/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { createArtifactPreviewHandler } from "../artifact-server.ts";
import { createArtifactFixture } from "../../../tests/helpers/artifact-fixture.ts";
import { fullSuiteIgnore } from "../../../tests/helpers/full-suite.ts";
import { createTestAppTargetConfig } from "../../../tests/helpers/test-app-config.ts";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test({
  name:
    "preview/artifact-server: should render ssr routes from runtime artifacts instead of serving the csr shell",
  ignore: fullSuiteIgnore(),
  async fn() {
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
        throw new Error(
          `preview build failed\nstdout:\n${stdout}\nstderr:\n${stderr}`,
        );
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
      assertStringIncludes(html, 'id="mainz-route-generation"');
      assertStringIncludes(html, '"documentRenderMode":"ssr"');

      const shellHtml = await Deno.readTextFile(
        resolve(testApp.outputDir, "index.html"),
      );
      assertEquals(shellHtml.includes("<main>SSR Build App</main>"), false);
    } finally {
      await testApp.cleanup();
    }
  },
});

Deno.test("preview/artifact-server: should keep browser csr routes from falling into ssr notFound artifacts", async () => {
  const fixture = await createArtifactFixture({
    routes: [{ path: "/", mode: "csr" }],
    notFoundMode: "ssr",
  });

  try {
    const handler = createArtifactPreviewHandler(fixture.rootDir);
    const response = await handler(
      new Request("http://127.0.0.1:4173/"),
    );
    const html = await response.text();

    assertEquals(response.status, 200);
    assertEquals(response.headers.get("x-mainz-preview-render-mode"), null);
    assertEquals(
      html,
      await Deno.readTextFile(
        resolve(fixture.rootDir, "browser", "index.html"),
      ),
    );
  } finally {
    await fixture.cleanup();
  }
});

Deno.test("preview/artifact-server: should support 404 routes in csr, ssg, and ssr modes", async (t) => {
  for (const notFoundMode of ["csr", "ssg", "ssr"] as const) {
    await t.step(notFoundMode, async () => {
      const fixture = await createArtifactFixture({
        routes: [{ path: "/", mode: "csr" }],
        notFoundMode,
      });

      try {
        const handler = createArtifactPreviewHandler(fixture.rootDir);
        const response = await handler(
          new Request("http://127.0.0.1:4173/missing"),
        );
        const html = await response.text();

        assertEquals(response.status, 404);
        assertStringIncludes(html, fixture.expectedNotFoundMarker);
        assertEquals(
          response.headers.get("x-mainz-preview-render-mode"),
          notFoundMode === "ssr" ? "ssr" : null,
        );
      } finally {
        await fixture.cleanup();
      }
    });
  }
});

Deno.test("preview/artifact-server: should support mixed csr, ssg, and ssr conventional routes in one app", async () => {
  const fixture = await createArtifactFixture({
    routes: [
      { path: "/", mode: "csr" },
      { path: "/docs", mode: "ssg" },
      { path: "/account", mode: "ssr" },
    ],
    notFoundMode: "csr",
  });

  try {
    const handler = createArtifactPreviewHandler(fixture.rootDir);
    const cases = [
      { path: "/", status: 200, header: null },
      { path: "/docs", status: 200, header: null },
      { path: "/account", status: 200, header: "ssr" },
      {
        path: "/missing",
        status: 404,
        header: null,
        marker: fixture.expectedNotFoundMarker,
      },
    ];

    for (const testCase of cases) {
      const response = await handler(
        new Request(`http://127.0.0.1:4173${testCase.path}`),
      );
      const html = await response.text();

      assertEquals(response.status, testCase.status);
      assertEquals(
        response.headers.get("x-mainz-preview-render-mode"),
        testCase.header,
      );
      assertStringIncludes(
        html,
        testCase.marker ?? fixture.expectedRouteMarkers.get(testCase.path)!,
      );
    }
  } finally {
    await fixture.cleanup();
  }
});
