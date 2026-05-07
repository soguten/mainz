/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createFixtureTargetConfig } from "../../../tests/helpers/fixture-config.ts";
import { runMainzCliCommand } from "../../../tests/helpers/cli.ts";
import { makeMainzTempDir } from "../../../tests/helpers/temp.ts";

const cliTestsRepoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const decoder = new TextDecoder();

Deno.test("cli/mainz: diagnose should print an empty array when no route diagnostics are found", async () => {
  const { stdout } = await runMainzCliCommand(
    ["diagnose", "--target", "playground"],
    "diagnose failed for playground.",
  );

  assertEquals(JSON.parse(stdout), []);
});

Deno.test("cli/mainz: diagnose should support CI-friendly failure on errors", async () => {
  const fixture = await createFixtureTargetConfig({
    fixtureName: "diagnostics-routes",
    targetName: "diagnostics-routes",
  });

  try {
    const command = new Deno.Command("deno", {
      args: [
        "run",
        "-A",
        "./src/cli/mainz.ts",
        "diagnose",
        "--config",
        fixture.configPath,
        "--target",
        fixture.targetName,
        "--fail-on",
        "error",
      ],
      cwd: cliTestsRepoRoot,
      stdout: "piped",
      stderr: "piped",
    });

    const result = await command.output();
    const stdout = decoder.decode(result.stdout);

    assertEquals(result.code, 1);
    assertStringIncludes(stdout, '"code": "dynamic-ssg-missing-entries"');
  } finally {
    await fixture.cleanup();
  }
});

Deno.test("cli/mainz: diagnose should support CI-friendly failure on warnings", async () => {
  const fixture = await createFixtureTargetConfig({
    fixtureName: "diagnostics-routes",
    targetName: "diagnostics-routes",
  });

  try {
    const command = new Deno.Command("deno", {
      args: [
        "run",
        "-A",
        "./src/cli/mainz.ts",
        "diagnose",
        "--config",
        fixture.configPath,
        "--target",
        fixture.targetName,
        "--fail-on",
        "warning",
      ],
      cwd: cliTestsRepoRoot,
      stdout: "piped",
      stderr: "piped",
    });

    const result = await command.output();
    const stdout = decoder.decode(result.stdout);

    assertEquals(result.code, 1);
    assertStringIncludes(
      stdout,
      '"code": "component-load-missing-placeholder"',
    );
  } finally {
    await fixture.cleanup();
  }
});

Deno.test("cli/mainz: diagnose should support a human-readable format", async () => {
  const fixture = await createFixtureTargetConfig({
    fixtureName: "diagnostics-routes",
    targetName: "diagnostics-routes",
  });

  try {
    const { stdout } = await runMainzCliCommand(
      [
        "diagnose",
        "--config",
        fixture.configPath,
        "--target",
        fixture.targetName,
        "--format",
        "human",
      ],
      "diagnose human output failed for diagnostics-routes fixture.",
    );

    assertStringIncludes(stdout, "Diagnostics summary:");
    assertStringIncludes(stdout, "Target: diagnostics-routes");
    assertStringIncludes(stdout, "error dynamic-ssg-missing-entries");
    assertStringIncludes(stdout, "route: /docs/:slug");
  } finally {
    await fixture.cleanup();
  }
});

Deno.test("cli/mainz: diagnose should support selecting one app by id", async () => {
  const fixture = await createFixtureTargetConfig({
    fixtureName: "diagnostics-multi-app",
    targetName: "diagnostics-multi-app",
  });

  try {
    const { stdout: defaultStdout } = await runMainzCliCommand(
      [
        "diagnose",
        "--config",
        fixture.configPath,
        "--target",
        fixture.targetName,
      ],
      "diagnose default app-aware output failed for diagnostics-multi-app fixture.",
    );
    const { stdout: selectedStdout } = await runMainzCliCommand(
      [
        "diagnose",
        "--config",
        fixture.configPath,
        "--target",
        fixture.targetName,
        "--app",
        "beta-app",
      ],
      "diagnose selected app output failed for diagnostics-multi-app fixture.",
    );

    const defaultDiagnostics = JSON.parse(defaultStdout) as Array<
      { code: string; appId?: string }
    >;
    const selectedDiagnostics = JSON.parse(selectedStdout) as Array<
      { code: string; appId?: string }
    >;

    assertEquals(
      defaultDiagnostics.some((diagnostic) =>
        diagnostic.appId === "alpha-app" &&
        diagnostic.code === "di-token-not-registered"
      ),
      true,
    );
    assertEquals(selectedDiagnostics, []);
  } finally {
    await fixture.cleanup();
  }
});

Deno.test("cli/mainz: diagnose should support selecting one root-only app by id", async () => {
  const fixture = await createFixtureTargetConfig({
    fixtureName: "diagnostics-multi-root-app",
    targetName: "diagnostics-multi-root-app",
  });

  try {
    const { stdout: defaultStdout } = await runMainzCliCommand(
      [
        "diagnose",
        "--config",
        fixture.configPath,
        "--target",
        fixture.targetName,
      ],
      "diagnose default app-aware output failed for diagnostics-multi-root-app fixture.",
    );
    const { stdout: selectedStdout } = await runMainzCliCommand(
      [
        "diagnose",
        "--config",
        fixture.configPath,
        "--target",
        fixture.targetName,
        "--app",
        "beta-root-app",
      ],
      "diagnose selected app output failed for diagnostics-multi-root-app fixture.",
    );

    const defaultDiagnostics = JSON.parse(defaultStdout) as Array<
      { code: string; appId?: string }
    >;
    const selectedDiagnostics = JSON.parse(selectedStdout) as Array<
      { code: string; appId?: string }
    >;

    assertEquals(
      defaultDiagnostics.some((diagnostic) =>
        diagnostic.appId === "alpha-root-app" &&
        diagnostic.code === "di-token-not-registered"
      ),
      true,
    );
    assertEquals(selectedDiagnostics, []);
  } finally {
    await fixture.cleanup();
  }
});

Deno.test("cli/mainz: diagnose should surface duplicate stable command ids for the selected app", async () => {
  const tempRoot = await makeMainzTempDir({
    cwd: cliTestsRepoRoot,
    prefix: "cli-command-diagnostics-",
    subdirectories: ["tests", "cli-diagnostics"],
  });
  const srcDir = resolve(tempRoot, "src");

  try {
    await Deno.mkdir(srcDir, { recursive: true });
    await Deno.writeTextFile(
      resolve(srcDir, "commands.ts"),
      [
        'import { defineCommand } from "../../../src/index.ts";',
        "",
        "export const alphaPrimaryCommand = defineCommand({",
        '  id: "docs.search.open",',
        "  execute: () => true,",
        "});",
        "",
        "export const alphaDuplicateCommand = defineCommand({",
        '  id: "docs.search.open",',
        "  execute: () => true,",
        "});",
        "",
        "export const betaCommand = defineCommand({",
        '  id: "docs.help.open",',
        "  execute: () => true,",
        "});",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      resolve(srcDir, "main.tsx"),
      [
        'import { defineApp, startApp } from "../../../src/index.ts";',
        'import { alphaDuplicateCommand, alphaPrimaryCommand, betaCommand } from "./commands.ts";',
        "",
        "const alphaApp = defineApp({",
        '  id: "alpha-app",',
        "  root: class AlphaRoot extends HTMLElement {},",
        "  commands: [alphaPrimaryCommand, alphaDuplicateCommand],",
        "});",
        "",
        "const betaApp = defineApp({",
        '  id: "beta-app",',
        "  root: class BetaRoot extends HTMLElement {},",
        "  commands: [betaCommand],",
        "});",
        "",
        "startApp(alphaApp, { mount: '#alpha' });",
        "startApp(betaApp, { mount: '#beta' });",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      resolve(tempRoot, "vite.config.ts"),
      "export default {};",
    );
    const configPath = resolve(tempRoot, "mainz.config.ts");
    await Deno.writeTextFile(
      configPath,
      [
        "export default {",
        "  targets: [",
        "    {",
        '      name: "cli-command-diagnostics",',
        `      rootDir: ${JSON.stringify(tempRoot)},`,
        `      viteConfig: ${
          JSON.stringify(resolve(tempRoot, "vite.config.ts"))
        },`,
        `      appFile: ${JSON.stringify(resolve(srcDir, "main.tsx"))},`,
        `      outDir: ${JSON.stringify(resolve(tempRoot, "dist"))}`,
        "    }",
        "  ]",
        "};",
        "",
      ].join("\n"),
    );

    const { stdout: defaultStdout } = await runMainzCliCommand(
      [
        "diagnose",
        "--config",
        configPath,
        "--target",
        "cli-command-diagnostics",
      ],
      "diagnose default output failed for cli-command-diagnostics fixture.",
    );
    const { stdout: selectedStdout } = await runMainzCliCommand(
      [
        "diagnose",
        "--config",
        configPath,
        "--target",
        "cli-command-diagnostics",
        "--app",
        "beta-app",
      ],
      "diagnose selected app output failed for cli-command-diagnostics fixture.",
    );

    const defaultDiagnostics = JSON.parse(defaultStdout) as Array<
      { code: string; appId?: string }
    >;
    const selectedDiagnostics = JSON.parse(selectedStdout) as Array<
      { code: string; appId?: string }
    >;

    assertEquals(
      defaultDiagnostics.some((diagnostic) =>
        diagnostic.appId === "alpha-app" &&
        diagnostic.code === "app-command-duplicate-id"
      ),
      true,
    );
    assertEquals(selectedDiagnostics, []);
  } finally {
    await Deno.remove(tempRoot, { recursive: true }).catch(() => undefined);
  }
});
