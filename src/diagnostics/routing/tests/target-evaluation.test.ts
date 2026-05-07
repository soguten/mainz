/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { normalizeMainzConfig } from "../../../config/index.ts";
import { createFixtureTargetConfig } from "../../../../tests/helpers/fixture-config.ts";
import { makeMainzTempDir } from "../../../../tests/helpers/temp.ts";
import { cliTestsRepoRoot } from "../../../../tests/helpers/types.ts";
import { resolveTargetDiagnosticsEvaluationsForTarget } from "../target-evaluation.ts";

Deno.test("diagnostics/routing: target evaluation should collect all routed app candidates in lexicographic app id order", async () => {
  const fixture = await createFixtureTargetConfig({
    fixtureName: "diagnostics-multi-app",
    targetName: "diagnostics-multi-app",
  });

  try {
    const target = normalizeMainzConfig({
      targets: [{
        name: fixture.targetName,
        rootDir: fixture.fixtureRoot,
        appFile: resolve(fixture.fixtureRoot, "src", "main.tsx"),
        outDir: fixture.outputDir,
      }],
    }).targets[0];

    const evaluations = await resolveTargetDiagnosticsEvaluationsForTarget(
      target,
    );

    assertEquals(
      evaluations.map((evaluation) => ({
        appId: evaluation.appId,
        paths: evaluation.discoveredPages.map((page) => page.path),
      })),
      [
        {
          appId: "alpha-app",
          paths: ["/alpha"],
        },
        {
          appId: "beta-app",
          paths: ["/beta"],
        },
      ],
    );
  } finally {
    await fixture.cleanup();
  }
});

Deno.test("diagnostics/routing: target evaluation should collect root-only app candidates in lexicographic app id order", async () => {
  const fixture = await createFixtureTargetConfig({
    fixtureName: "diagnostics-multi-root-app",
    targetName: "diagnostics-multi-root-app",
  });

  try {
    const target = normalizeMainzConfig({
      targets: [{
        name: fixture.targetName,
        rootDir: fixture.fixtureRoot,
        appFile: resolve(fixture.fixtureRoot, "src", "main.tsx"),
        outDir: fixture.outputDir,
      }],
    }).targets[0];

    const evaluations = await resolveTargetDiagnosticsEvaluationsForTarget(
      target,
    );

    assertEquals(
      evaluations.map((evaluation) => ({
        appId: evaluation.appId,
        pages: evaluation.discoveredPages.length,
      })),
      [
        {
          appId: "alpha-root-app",
          pages: 0,
        },
        {
          appId: "beta-root-app",
          pages: 0,
        },
      ],
    );
  } finally {
    await fixture.cleanup();
  }
});

Deno.test("diagnostics/routing: target evaluation should read app-owned authorization policy names", async () => {
  const fixture = await createFixtureTargetConfig({
    fixtureName: "diagnostics-authorization-policies",
    targetName: "diagnostics-authorization-policies",
  });

  try {
    const target = normalizeMainzConfig({
      targets: [{
        name: fixture.targetName,
        rootDir: fixture.fixtureRoot,
        appFile: resolve(fixture.fixtureRoot, "src", "main.tsx"),
        outDir: fixture.outputDir,
      }],
    }).targets[0];

    const evaluations = await resolveTargetDiagnosticsEvaluationsForTarget(
      target,
    );

    assertEquals(evaluations.length, 1);
    assertEquals(evaluations[0]?.appId, "diagnostics-authorization-policies");
    assertEquals(evaluations[0]?.authorizationPolicyNames, ["org-member"]);
  } finally {
    await fixture.cleanup();
  }
});

Deno.test("diagnostics/routing: target evaluation should report when a discovered routed app is missing id", async () => {
  const tempRoot = await makeMainzTempDir({
    cwd: cliTestsRepoRoot,
    prefix: "route-app-id-",
    subdirectories: ["tests", "routing"],
  });
  const srcDir = resolve(tempRoot, "src");
  const pagesDir = resolve(srcDir, "pages");

  try {
    await Deno.mkdir(pagesDir, { recursive: true });
    await Deno.writeTextFile(
      resolve(srcDir, "main.tsx"),
      [
        'import { defineApp, startApp } from "../../../src/index.ts";',
        'import { MissingIdPage } from "./pages/MissingId.page.tsx";',
        "",
        "const app = defineApp({",
        "  // @ts-ignore test fixture intentionally omits id",
        "  pages: [MissingIdPage],",
        "});",
        "",
        "startApp(app, { mount: '#app' });",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      resolve(pagesDir, "MissingId.page.tsx"),
      [
        'import { Page, Route } from "../../../../src/index.ts";',
        "",
        '@Route("/")',
        "export class MissingIdPage extends Page {",
        "  override render() {",
        "    return <div>Missing id</div>;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    const target = normalizeMainzConfig({
      targets: [{
        name: "missing-id-app",
        rootDir: tempRoot,
        appFile: resolve(srcDir, "main.tsx"),
        outDir: resolve(tempRoot, "dist"),
      }],
    }).targets[0];

    const evaluations = await resolveTargetDiagnosticsEvaluationsForTarget(
      target,
    );

    assertEquals(evaluations.length, 1);
    assertEquals(evaluations[0]?.appId, undefined);
    assertStringIncludes(
      evaluations[0]?.discoveryErrors?.[0]?.message ?? "",
      "must declare a unique string id",
    );
  } finally {
    await Deno.remove(tempRoot, { recursive: true }).catch(() => undefined);
  }
});
