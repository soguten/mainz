/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolve } from "node:path";
import { normalizeMainzConfig } from "../../config/index.ts";
import { createFixtureTargetConfig } from "../../../tests/helpers/fixture-config.ts";
import { buildDiagnosticsTargetModelsForTarget } from "../core/target-model-builder.ts";

Deno.test("diagnostics: target model builder should build app-scoped diagnostics models", async () => {
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
    await fixture.cleanup();
  }
});
