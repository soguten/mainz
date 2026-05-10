/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { normalizeMainzConfig } from "../../config/index.ts";
import { createTestAppTargetConfig } from "../../../tests/helpers/test-app-config.ts";
import { buildDiagnosticsTargetModelsForTarget } from "../core/target-model-builder.ts";

Deno.test("diagnostics: target model builder should build app-scoped diagnostics models", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "diagnostics-authorization-policies",
    targetName: "diagnostics-authorization-policies",
  });

  try {
    const target = normalizeMainzConfig({
      targets: [{
        name: testApp.targetName,
        rootDir: testApp.testAppRoot,
        appFile: resolve(testApp.testAppRoot, "src", "main.tsx"),
        outDir: testApp.outputDir,
      }],
    }).targets[0];

    const builtModels = await buildDiagnosticsTargetModelsForTarget(target);
    const builtModel = builtModels[0];
    const model = builtModel?.model;
    const firstPage = model?.pages[0];

    assertEquals(builtModels.length, 1);
    assertEquals(builtModel?.appId, "diagnostics-authorization-policies");
    assertEquals(builtModel?.discoveryDiagnostics, []);
    assertEquals(model?.context.registeredPolicyNames, ["org-member"]);
    assertEquals(model?.pages.map((page) => page.page.path), ["/org"]);
    assertEquals(
      model?.context.routePathsByOwner.get(
        `${firstPage?.file}::${firstPage?.exportName}`,
      ),
      "/org",
    );
    assertEquals(
      model?.sourceInputs.some((input) => input.file.endsWith("src/main.tsx")),
      true,
    );
  } finally {
    await testApp.cleanup();
  }
});
