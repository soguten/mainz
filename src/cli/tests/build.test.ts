/// <reference lib="deno.ns" />

import { resolve } from "node:path";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createTestAppTargetConfig } from "../../../tests/helpers/test-app-config.ts";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test("cli/build: should fail the build when a forbidden-in-ssg component is prerendered", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "forbidden-in-ssg-build",
    targetName: "forbidden-in-ssg-build",
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
    const stdout = new TextDecoder().decode(result.stdout);
    const stderr = new TextDecoder().decode(result.stderr);

    assertEquals(result.code, 1);
    assertStringIncludes(stdout + stderr, 'Failed to prerender SSG route "/"');
    assertStringIncludes(
      stdout + stderr,
      'Component "LivePreview" uses @RenderPolicy("forbidden-in-ssg") and cannot be rendered during SSG.',
    );
    assertStringIncludes(
      stdout + stderr,
      "Remove it from the SSG path or render this route in a non-SSG mode.",
    );
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("cli/build: should warn for ownership-based defer placeholders without placeholder() during ssg prerender", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "component-load-ssg-warnings-build",
    targetName: "component-load-ssg-warnings-build",
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
    const stdout = new TextDecoder().decode(result.stdout);
    const stderr = new TextDecoder().decode(result.stderr);
    const combinedOutput = stdout + stderr;

    assertEquals(result.code, 0);
    assertStringIncludes(
      combinedOutput,
      'SSG prerender warning for route "/" and output "/" (locale "en"): Component "DeferredWithoutFallback" uses @RenderStrategy("defer") without a placeholder(). Add placeholder() to make the component\'s async placeholder explicit.',
    );
    assertEquals(
      combinedOutput.match(
        /SSG prerender warning for route "\/" and output "\/" \(locale "en"\):/g,
      )?.length ?? 0,
      1,
    );

    const html = await Deno.readTextFile(
      resolve(testApp.outputDir, "ssg", "index.html"),
    );
    assertStringIncludes(html, "Component Load SSG Warnings");
    assertStringIncludes(html, "loading related docs");
    assertStringIncludes(html, "loading recent docs");
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("cli/build: should resolve dynamic entries() under the build-time app service container", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "entries-di-build",
    targetName: "entries-di-build",
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
    const stdout = new TextDecoder().decode(result.stdout);
    const stderr = new TextDecoder().decode(result.stderr);

    assertEquals(result.code, 0, `stdout:\n${stdout}\nstderr:\n${stderr}`);

    const html = await Deno.readTextFile(
      resolve(
        testApp.outputDir,
        "ssg",
        "stories",
        "hello-from-di",
        "index.html",
      ),
    );
    assertStringIncludes(html, "Entries DI Build");
    assertStringIncludes(html, "hello-from-di");
    assertStringIncludes(html, "en");
  } finally {
    await testApp.cleanup();
  }
});
