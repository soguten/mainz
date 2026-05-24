/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { serveBuildArtifacts } from "../artifact-server.ts";
import { createArtifactFixture } from "../../../tests/helpers/artifact-fixture.ts";
import { fullSuiteIgnore } from "../../../tests/helpers/full-suite.ts";
import { createTestAppTargetConfig } from "../../../tests/helpers/test-app-config.ts";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test({
  name:
    "server/artifact-server: should serve SSR routes from built server artifacts",
  ignore: fullSuiteIgnore(),
  async fn() {
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
      assertStringIncludes(html, 'id="mainz-route-generation"');
      assertStringIncludes(html, '"documentRenderMode":"ssr"');
    } finally {
      if (server) {
        await server.shutdown();
        await server.finished;
      }
      await testApp.cleanup();
    }
  },
});

Deno.test({
  name:
    "server/artifact-server: should serve browser shell when no SSR manifest exists",
  ignore: fullSuiteIgnore(),
  async fn() {
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
  },
});

Deno.test("server/artifact-server: should keep browser csr routes from falling into ssr notFound artifacts", async () => {
  const fixture = await createArtifactFixture({
    routes: [{ path: "/", mode: "csr" }],
    notFoundMode: "ssr",
  });

  let server: Deno.HttpServer<Deno.NetAddr> | undefined;

  try {
    server = serveBuildArtifacts({
      rootDir: fixture.rootDir,
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
    assertEquals(response.headers.get("x-mainz-preview-render-mode"), null);
    assertEquals(
      html,
      await Deno.readTextFile(
        resolve(fixture.rootDir, "browser", "index.html"),
      ),
    );
  } finally {
    if (server) {
      await server.shutdown();
      await server.finished;
    }
    await fixture.cleanup();
  }
});

Deno.test("server/artifact-server: should support 404 routes in csr, ssg, and ssr modes", async (t) => {
  for (const notFoundMode of ["csr", "ssg", "ssr"] as const) {
    await t.step(notFoundMode, async () => {
      const fixture = await createArtifactFixture({
        routes: [{ path: "/", mode: "csr" }],
        notFoundMode,
      });

      let server: Deno.HttpServer<Deno.NetAddr> | undefined;
      try {
        server = serveBuildArtifacts({
          rootDir: fixture.rootDir,
          host: "127.0.0.1",
          port: 0,
          onListen: () => {},
        });

        const response = await fetch(
          `http://127.0.0.1:${server.addr.port}/missing`,
          {
            headers: { "accept": "text/html" },
          },
        );
        const html = await response.text();

        assertEquals(response.status, 404);
        assertStringIncludes(html, fixture.expectedNotFoundMarker);
      } finally {
        if (server) {
          await server.shutdown();
          await server.finished;
        }
        await fixture.cleanup();
      }
    });
  }
});

Deno.test("server/artifact-server: should support mixed csr, ssg, and ssr conventional routes in one app", async () => {
  const fixture = await createArtifactFixture({
    routes: [
      { path: "/", mode: "csr" },
      { path: "/docs", mode: "ssg" },
      { path: "/account", mode: "ssr" },
    ],
    notFoundMode: "csr",
  });

  let server: Deno.HttpServer<Deno.NetAddr> | undefined;

  try {
    server = serveBuildArtifacts({
      rootDir: fixture.rootDir,
      host: "127.0.0.1",
      port: 0,
      onListen: () => {},
    });

    const cases = [
      { path: "/", status: 200 },
      { path: "/docs", status: 200 },
      { path: "/account", status: 200 },
      { path: "/missing", status: 404, marker: fixture.expectedNotFoundMarker },
    ];

    for (const testCase of cases) {
      const response = await fetch(
        `http://127.0.0.1:${server.addr.port}${testCase.path}`,
        {
          headers: { "accept": "text/html" },
        },
      );
      const html = await response.text();

      assertEquals(response.status, testCase.status);
      assertStringIncludes(
        html,
        testCase.marker ?? fixture.expectedRouteMarkers.get(testCase.path)!,
      );
    }
  } finally {
    if (server) {
      await server.shutdown();
      await server.finished;
    }
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
