import { dirname, resolve } from "node:path";
import type { TestAppTargetConfig } from "./types.ts";
import { createTestAppTargetDefinition } from "./build.ts";

export async function createTestAppTargetConfig(args: {
  testAppName: string;
  targetName?: string;
  appFile?: string;
}): Promise<TestAppTargetConfig> {
  const testApp = await createTestAppTargetDefinition(args);
  const configPath = resolve(
    dirname(dirname(testApp.outputDir)),
    "mainz.test-app.config.ts",
  );
  await Deno.writeTextFile(
    configPath,
    [
      "export default {",
      "  targets: [",
      renderTestAppTargetDefinition(testApp.target),
      "  ]",
      "};",
      "",
    ].join("\n"),
  );

  return {
    ...testApp,
    configPath,
  };
}

function renderTestAppTargetDefinition(
  target: TestAppTargetConfig["target"],
): string {
  return [
    "    {",
    `      name: ${JSON.stringify(target.name)},`,
    `      rootDir: ${JSON.stringify(target.rootDir)},`,
    ...(target.viteConfig
      ? [`      viteConfig: ${JSON.stringify(target.viteConfig)},`]
      : []),
    ...(target.appFile
      ? [`      appFile: ${JSON.stringify(target.appFile)},`]
      : []),
    ...(target.buildConfig
      ? [`      buildConfig: ${JSON.stringify(target.buildConfig)},`]
      : []),
    `      outDir: ${JSON.stringify(target.outDir)},`,
    "    }",
  ].join("\n");
}
