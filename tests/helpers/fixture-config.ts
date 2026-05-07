import { dirname, resolve } from "node:path";
import type { FixtureTargetConfig } from "./types.ts";
import { createFixtureTargetDefinition } from "./build.ts";

export async function createFixtureTargetConfig(args: {
  fixtureName: string;
  targetName?: string;
  appFile?: string;
}): Promise<FixtureTargetConfig> {
  const fixture = await createFixtureTargetDefinition(args);
  const configPath = resolve(
    dirname(dirname(fixture.outputDir)),
    "mainz.fixture.config.ts",
  );
  await Deno.writeTextFile(
    configPath,
    [
      "export default {",
      "  targets: [",
      renderFixtureTargetDefinition(fixture.target),
      "  ]",
      "};",
      "",
    ].join("\n"),
  );

  return {
    ...fixture,
    configPath,
  };
}

function renderFixtureTargetDefinition(
  target: FixtureTargetConfig["target"],
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
