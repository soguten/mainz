import { dirname, resolve } from "node:path";
import type { FixtureTargetConfig } from "./types.ts";
import { createFixtureTargetDefinition } from "./build.ts";

export async function createFixtureTargetConfig(args: {
    fixtureName: string;
    targetName?: string;
    appFile?: string;
    omitPagesDir?: boolean;
    locales?: readonly string[];
    defaultLocale?: string;
    localePrefix?: "auto" | "always";
    authorizationPolicyNames?: readonly string[];
}): Promise<FixtureTargetConfig> {
    const fixture = await createFixtureTargetDefinition(args);
    const configPath = resolve(dirname(dirname(fixture.outputDir)), "mainz.fixture.config.ts");
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
        `      viteConfig: ${JSON.stringify(target.viteConfig)},`,
        ...(target.pagesDir ? [`      pagesDir: ${JSON.stringify(target.pagesDir)},`] : []),
        ...(target.appFile ? [`      appFile: ${JSON.stringify(target.appFile)},`] : []),
        ...(target.buildConfig ? [`      buildConfig: ${JSON.stringify(target.buildConfig)},`] : []),
        `      outDir: ${JSON.stringify(target.outDir)},`,
        ...(target.locales ? [`      locales: ${JSON.stringify(target.locales)},`] : []),
        ...(target.i18n
            ? [
                "      i18n: {",
                `        defaultLocale: ${JSON.stringify(target.i18n.defaultLocale)},`,
                `        localePrefix: ${JSON.stringify(target.i18n.localePrefix)},`,
                `        fallbackLocale: ${JSON.stringify(target.i18n.fallbackLocale)}`,
                "      },",
            ]
            : []),
        ...(target.authorization?.policyNames?.length
            ? [
                "      authorization: {",
                `        policyNames: ${JSON.stringify(target.authorization.policyNames)}`,
                "      },",
            ]
            : []),
        "    }",
    ].join("\n");
}
