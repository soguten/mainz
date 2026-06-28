/// <reference lib="deno.ns" />

import { delimiter, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

const decoder = new TextDecoder();
const pinnedMainzSpecifier = await resolvePublishedMainzSpecifier();
const nodeShimSpecifierRewrites = [
  ['"npm:tsx@4.22.4/esm/api"', '"tsx/esm/api"'],
] as const;

Deno.test("cli/local-launcher: deno project should create and inspect an app through the local launcher", async () => {
  const cwd = await Deno.makeTempDir({ prefix: "mainz-local-deno-app-" });

  try {
    const init = await runGlobalMainz(cwd, [
      "init",
      "--mainz",
      pinnedMainzSpecifier,
    ]);
    assertEquals(init.code, 0, `stdout:\n${init.stdout}\nstderr:\n${init.stderr}`);
    await rewireDenoProjectToLocalTooling(cwd);

    const create = await runDenoProjectMainz(cwd, ["app", "create", "site"]);
    assertEquals(
      create.code,
      0,
      `stdout:\n${create.stdout}\nstderr:\n${create.stderr}`,
    );
    assertStringIncludes(create.stdout, 'Created app "site"');

    const info = await runDenoProjectMainz(cwd, ["app", "info", "site"]);
    assertEquals(info.code, 0, `stdout:\n${info.stdout}\nstderr:\n${info.stderr}`);

    const parsed = JSON.parse(info.stdout) as {
      target: string;
      rootDir: string;
      appId: string;
    };
    assertEquals(parsed.target, "site");
    assertEquals(parsed.rootDir, "./site");
    assertEquals(parsed.appId, "site");

    const list = await runDenoProjectMainz(cwd, ["app", "list"]);
    assertEquals(list.code, 0, `stdout:\n${list.stdout}\nstderr:\n${list.stderr}`);
    assertEquals(
      JSON.parse(list.stdout) as Array<{
        target: string;
        appId: string;
        rootDir: string;
        appFile: string;
        outDir: string;
      }>,
      [{
        target: "site",
        appId: "site",
        rootDir: "./site",
        appFile: "./site/src/app.ts",
        outDir: "dist/site",
      }],
    );

    const remove = await runDenoProjectMainz(cwd, ["app", "remove", "site"]);
    assertEquals(
      remove.code,
      0,
      `stdout:\n${remove.stdout}\nstderr:\n${remove.stderr}`,
    );
    assertStringIncludes(remove.stdout, 'Removed app target "site"');
  } finally {
    await Deno.remove(cwd, { recursive: true });
  }
});

Deno.test("cli/local-launcher: deno starter project should inspect and diagnose through the local launcher", async () => {
  const cwd = await Deno.makeTempDir({ prefix: "mainz-local-deno-starter-" });

  try {
    const init = await runGlobalMainz(cwd, [
      "init",
      "demo",
      "--template",
      "starter",
      "--mainz",
      pinnedMainzSpecifier,
    ]);
    assertEquals(init.code, 0, `stdout:\n${init.stdout}\nstderr:\n${init.stderr}`);

    const projectDir = resolve(cwd, "demo");
    await rewireDenoProjectToLocalTooling(projectDir);
    const build = await runDenoProjectMainz(projectDir, ["build", "--target", "app"]);
    assertEquals(
      build.code,
      0,
      `stdout:\n${build.stdout}\nstderr:\n${build.stderr}`,
    );
    assertStringIncludes(build.stdout, "[mainz] Building");

    const info = await runDenoProjectMainz(projectDir, ["app", "info", "app"]);
    assertEquals(info.code, 0, `stdout:\n${info.stdout}\nstderr:\n${info.stderr}`);
    const appInfo = JSON.parse(info.stdout) as {
      target: string;
      rootDir: string;
      appId: string;
    };
    assertEquals(appInfo.target, "app");
    assertEquals(appInfo.rootDir, "./app");
    assertEquals(appInfo.appId, "app");

    const diagnose = await runDenoProjectMainz(projectDir, [
      "diagnose",
      "--target",
      "app",
    ]);
    assertEquals(
      diagnose.code,
      0,
      `stdout:\n${diagnose.stdout}\nstderr:\n${diagnose.stderr}`,
    );
    assertEquals(JSON.parse(diagnose.stdout), []);

    const taskBuild = await runDenoProjectTask(projectDir, "build", [
      "--target",
      "app",
    ]);
    assertEquals(
      taskBuild.code,
      0,
      `stdout:\n${taskBuild.stdout}\nstderr:\n${taskBuild.stderr}`,
    );
    assertStringIncludes(taskBuild.stdout, "[mainz] Building");

    const taskDiagnose = await runDenoProjectTask(projectDir, "diagnose", [
      "--target",
      "app",
    ]);
    assertEquals(
      taskDiagnose.code,
      0,
      `stdout:\n${taskDiagnose.stdout}\nstderr:\n${taskDiagnose.stderr}`,
    );
    assertEquals(JSON.parse(taskDiagnose.stdout), []);

    await assertLauncherRejectsMissingTarget(
      () => runDenoProjectTask(projectDir, "dev", ["--target", "missing-target"]),
      "missing-target",
    );
    await assertLauncherRejectsMissingTarget(
      () => runDenoProjectTask(projectDir, "preview", ["--target", "missing-target"]),
      "missing-target",
    );

    const devSession = await runDenoProjectTaskSession(
      projectDir,
      "dev",
      ["--target", "app"],
      12000,
    );
    assertStringIncludes(devSession.stdout, "VITE");
    assertEquals(
      devSession.stderr.includes("Failed to run dependency scan"),
      false,
      `stdout:\n${devSession.stdout}\nstderr:\n${devSession.stderr}`,
    );
    assertEquals(
      devSession.stderr.includes("react/jsx-dev-runtime"),
      false,
      `stdout:\n${devSession.stdout}\nstderr:\n${devSession.stderr}`,
    );
  } finally {
    await Deno.remove(cwd, { recursive: true });
  }
});

Deno.test("cli/local-launcher: node starter project should inspect and diagnose through the local launcher shim", async () => {
  const cwd = await Deno.makeTempDir({ prefix: "mainz-local-node-starter-" });

  try {
    const init = await runGlobalMainz(cwd, [
      "init",
      "demo",
      "--template",
      "starter",
      "--runtime",
      "node",
      "--mainz",
      pinnedMainzSpecifier,
    ]);
    assertEquals(init.code, 0, `stdout:\n${init.stdout}\nstderr:\n${init.stderr}`);

    const projectDir = resolve(cwd, "demo");
    await rewireNodeProjectToLocalTooling(projectDir);

    const install = await runCommand("npm", ["install"], projectDir);
    assertEquals(
      install.code,
      0,
      `stdout:\n${install.stdout}\nstderr:\n${install.stderr}`,
    );
    await installNodeMainzShim(projectDir);

    const info = await runNodeProjectMainz(projectDir, ["app", "info", "app"]);
    assertEquals(info.code, 0, `stdout:\n${info.stdout}\nstderr:\n${info.stderr}`);
    const appInfo = JSON.parse(info.stdout) as {
      target: string;
      rootDir: string;
      appId: string;
    };
    assertEquals(appInfo.target, "app");
    assertEquals(appInfo.rootDir, "./app");
    assertEquals(appInfo.appId, "app");

    const diagnose = await runNodeProjectMainz(projectDir, [
      "diagnose",
      "--target",
      "app",
    ]);
    assertEquals(
      diagnose.code,
      0,
      `stdout:\n${diagnose.stdout}\nstderr:\n${diagnose.stderr}`,
    );
    assertEquals(JSON.parse(diagnose.stdout), []);

    const build = await runNodeProjectMainz(projectDir, ["build", "--target", "app"]);
    assertEquals(
      build.code,
      0,
      `stdout:\n${build.stdout}\nstderr:\n${build.stderr}`,
    );
    assertStringIncludes(build.stdout, "[mainz] Building");

    const scriptBuild = await runNodeProjectScript(projectDir, "build", [
      "--target",
      "app",
    ]);
    assertEquals(
      scriptBuild.code,
      0,
      `stdout:\n${scriptBuild.stdout}\nstderr:\n${scriptBuild.stderr}`,
    );
    assertStringIncludes(scriptBuild.stdout, "[mainz] Building");

    const scriptDiagnose = await runNodeProjectScript(projectDir, "diagnose", [
      "--target",
      "app",
    ]);
    assertEquals(
      scriptDiagnose.code,
      0,
      `stdout:\n${scriptDiagnose.stdout}\nstderr:\n${scriptDiagnose.stderr}`,
    );
    assertEquals(JSON.parse(scriptDiagnose.stdout), []);

    await assertLauncherRejectsMissingTarget(
      () => runNodeProjectScript(projectDir, "dev", ["--target", "missing-target"]),
      "missing-target",
    );
    await assertLauncherRejectsMissingTarget(
      () => runNodeProjectScript(projectDir, "preview", ["--target", "missing-target"]),
      "missing-target",
    );
  } finally {
    await Deno.remove(cwd, { recursive: true });
  }
});

Deno.test("cli/local-launcher: deno project should materialize and dematerialize vite through the local launcher", async () => {
  const cwd = await Deno.makeTempDir({ prefix: "mainz-local-vite-" });

  try {
    const init = await runGlobalMainz(cwd, [
      "init",
      "--mainz",
      pinnedMainzSpecifier,
    ]);
    assertEquals(init.code, 0, `stdout:\n${init.stdout}\nstderr:\n${init.stderr}`);
    await rewireDenoProjectToLocalTooling(cwd);

    const create = await runDenoProjectMainz(cwd, ["app", "create", "site"]);
    assertEquals(
      create.code,
      0,
      `stdout:\n${create.stdout}\nstderr:\n${create.stderr}`,
    );

    await Deno.writeTextFile(
      resolve(cwd, "mainz.config.ts"),
      [
        'import { defineMainzConfig } from "mainz/config";',
        "",
        "export default defineMainzConfig({",
        '    runtime: "deno",',
        "    targets: [",
        "        {",
        '            name: "site",',
        '            rootDir: "./site",',
        '            appFile: "./site/src/app.ts",',
        '            appId: "site",',
        '            outDir: "dist/site",',
        "            vite: {",
        "                alias: [",
        '                    { find: "@content", replacement: "./site/src/content" },',
        "                ],",
        "                define: {",
        '                    "__SITE_FLAG__": "true",',
        "                },",
        "            },",
        "        },",
        "    ],",
        "});",
        "",
      ].join("\n"),
    );

    const materialize = await runDenoProjectMainz(cwd, [
      "vite",
      "materialize",
      "--target",
      "site",
    ]);
    assertEquals(
      materialize.code,
      0,
      `stdout:\n${materialize.stdout}\nstderr:\n${materialize.stderr}`,
    );
    assertStringIncludes(materialize.stdout, 'Materialized Vite config for target "site"');

    const materializedConfig = await Deno.readTextFile(
      resolve(cwd, "site", "vite.config.ts"),
    );
    assertStringIncludes(materializedConfig, "@mainz-materialized-vite-config");

    const dematerialize = await runDenoProjectMainz(cwd, [
      "vite",
      "dematerialize",
      "--target",
      "site",
    ]);
    assertEquals(
      dematerialize.code,
      0,
      `stdout:\n${dematerialize.stdout}\nstderr:\n${dematerialize.stderr}`,
    );
    assertStringIncludes(
      dematerialize.stdout,
      'Removed materialized Vite config for target "site"',
    );

    await assertPathMissing(resolve(cwd, "site", "vite.config.ts"));
  } finally {
    await Deno.remove(cwd, { recursive: true });
  }
});

Deno.test("cli/local-launcher: deno project should run container commands through the local launcher", async () => {
  const cwd = await Deno.makeTempDir({ prefix: "mainz-local-container-" });
  const dockerSpyDir = await Deno.makeTempDir({ prefix: "mainz-local-docker-spy-" });

  try {
    const init = await runGlobalMainz(cwd, [
      "init",
      "demo",
      "--template",
      "starter",
      "--mainz",
      pinnedMainzSpecifier,
    ]);
    assertEquals(init.code, 0, `stdout:\n${init.stdout}\nstderr:\n${init.stderr}`);

    const projectDir = resolve(cwd, "demo");
    await rewireDenoProjectToLocalTooling(projectDir);

    const dockerArgsPath = resolve(dockerSpyDir, "docker-args.txt");
    await writeDockerSpy(dockerSpyDir, dockerArgsPath);
    const env = {
      PATH: `${dockerSpyDir}${delimiter}${Deno.env.get("PATH") ?? ""}`,
    };

    const containerInit = await runDenoProjectMainz(projectDir, [
      "container",
      "init",
      "--target",
      "app",
    ], { env });
    assertEquals(
      containerInit.code,
      0,
      `stdout:\n${containerInit.stdout}\nstderr:\n${containerInit.stderr}`,
    );
    assertStringIncludes(containerInit.stdout, "Generated browser-only Dockerfile");

    const dockerfile = await Deno.readTextFile(resolve(projectDir, "app", "Dockerfile"));
    assertStringIncludes(dockerfile, '# mainz container image build --target app');

    const containerBuild = await runDenoProjectMainz(projectDir, [
      "container",
      "build",
      "--target",
      "app",
    ], { env });
    assertEquals(
      containerBuild.code,
      0,
      `stdout:\n${containerBuild.stdout}\nstderr:\n${containerBuild.stderr}`,
    );
    assertStringIncludes(containerBuild.stdout, 'Built Docker image "app:local"');

    const containerImageBuild = await runDenoProjectMainz(projectDir, [
      "container",
      "image",
      "build",
      "--target",
      "app",
    ], { env });
    assertEquals(
      containerImageBuild.code,
      0,
      `stdout:\n${containerImageBuild.stdout}\nstderr:\n${containerImageBuild.stderr}`,
    );
    assertStringIncludes(
      containerImageBuild.stdout,
      'Built Docker image "app:local"',
    );

    const containerRun = await runDenoProjectMainz(projectDir, [
      "container",
      "run",
      "--target",
      "app",
    ], { env });
    assertEquals(
      containerRun.code,
      0,
      `stdout:\n${containerRun.stdout}\nstderr:\n${containerRun.stderr}`,
    );
    assertStringIncludes(containerRun.stdout, "Open http://localhost:3000/");

    const dockerArgs = normalizeDockerArgs(
      await Deno.readTextFile(dockerArgsPath),
    );
    assertStringIncludes(dockerArgs, "image build");
    assertStringIncludes(dockerArgs, "run --rm -p 3000:3000");
  } finally {
    await Deno.remove(cwd, { recursive: true });
    await Deno.remove(dockerSpyDir, { recursive: true });
  }
});

Deno.test("cli/local-launcher: project-secondary commands should stay available through the deno local launcher", async () => {
  const cwd = await Deno.makeTempDir({ prefix: "mainz-local-secondary-" });

  try {
    const init = await runGlobalMainz(cwd, [
      "init",
      "--mainz",
      pinnedMainzSpecifier,
    ]);
    assertEquals(init.code, 0, `stdout:\n${init.stdout}\nstderr:\n${init.stderr}`);
    await rewireDenoProjectToLocalTooling(cwd);

    const publishInfoHelp = await runDenoProjectMainz(cwd, ["publish-info", "--help"]);
    assertEquals(publishInfoHelp.code, 0);
    assertStringIncludes(publishInfoHelp.stdout, "Mainz CLI - publish-info");

    const profileHelp = await runDenoProjectMainz(cwd, ["profile", "create", "--help"]);
    assertEquals(profileHelp.code, 0);
    assertStringIncludes(profileHelp.stdout, "Mainz CLI - profile create");

    const workflowHelp = await runDenoProjectMainz(cwd, ["workflow", "create", "--help"]);
    assertEquals(workflowHelp.code, 0);
    assertStringIncludes(workflowHelp.stdout, "Mainz CLI - workflow create");
  } finally {
    await Deno.remove(cwd, { recursive: true });
  }
});

async function runGlobalMainz(
  cwd: string,
  args: readonly string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  return await runCommand(
    "deno",
    [
      "run",
      "-A",
      resolve(cliTestsRepoRoot, "src", "cli", "mainz.ts"),
      ...args,
    ],
    cwd,
  );
}

async function runDenoProjectMainz(
  cwd: string,
  args: readonly string[],
  options: { env?: Record<string, string> } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return await runCommand(
    "deno",
    ["task", "mainz", ...args],
    cwd,
    options,
  );
}

async function runNodeProjectMainz(
  cwd: string,
  args: readonly string[],
  options: { env?: Record<string, string> } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return await runCommand(
    "npm",
    ["run", "--silent", "mainz", "--", ...args],
    cwd,
    options,
  );
}

async function runDenoProjectTask(
  cwd: string,
  task: string,
  args: readonly string[],
  options: { env?: Record<string, string> } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return await runCommand(
    "deno",
    ["task", task, ...args],
    cwd,
    options,
  );
}

async function runNodeProjectScript(
  cwd: string,
  script: string,
  args: readonly string[],
  options: { env?: Record<string, string> } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return await runCommand(
    "npm",
    ["run", "--silent", script, "--", ...args],
    cwd,
    options,
  );
}

async function runDenoProjectTaskSession(
  cwd: string,
  task: string,
  args: readonly string[],
  durationMs: number,
  options: { env?: Record<string, string> } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  const child = new Deno.Command("deno", {
    args: ["task", task, ...args],
    cwd,
    env: options.env,
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  await new Promise((resolve) => setTimeout(resolve, durationMs));
  try {
    child.kill("SIGTERM");
  } catch {
    // The dev server may already have exited by the time we stop the session.
  }

  const result = await child.output();
  return {
    code: result.code,
    stdout: decoder.decode(result.stdout),
    stderr: decoder.decode(result.stderr),
  };
}

async function runCommand(
  command: string,
  args: readonly string[],
  cwd: string,
  options: { env?: Record<string, string> } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  const runner = new Deno.Command(command, {
    args: [...args],
    cwd,
    env: options.env,
    stdout: "piped",
    stderr: "piped",
  });

  const result = await runner.output();

  return {
    code: result.code,
    stdout: decoder.decode(result.stdout),
    stderr: decoder.decode(result.stderr),
  };
}

async function resolvePublishedMainzSpecifier(): Promise<string> {
  const jsrConfig = JSON.parse(
    await Deno.readTextFile(resolve(cliTestsRepoRoot, "jsr.json")),
  ) as { version: string };
  return `jsr:@mainz/mainz@${jsrConfig.version}`;
}

async function rewireDenoProjectToLocalTooling(projectDir: string): Promise<void> {
  const denoJsonPath = resolve(projectDir, "deno.json");
  const denoConfig = JSON.parse(
    await Deno.readTextFile(denoJsonPath),
  ) as {
    imports?: Record<string, string>;
    tasks?: Record<string, string>;
  };

  denoConfig.imports = {
    ...(denoConfig.imports ?? {}),
    "@deno/loader": "npm:@jsr/deno__loader@^0.5.0",
    "@std/jsonc": "npm:@jsr/std__jsonc@^1",
    "happy-dom": "npm:happy-dom@20.9.0",
    mainz: toFileSpecifier(resolve(cliTestsRepoRoot, "mod.ts")),
    "mainz/config": toFileSpecifier(
      resolve(cliTestsRepoRoot, "src", "public", "config.ts"),
    ),
    "mainz/jsx-runtime": toFileSpecifier(
      resolve(cliTestsRepoRoot, "src", "jsx-runtime.ts"),
    ),
    "mainz/jsx-dev-runtime": toFileSpecifier(
      resolve(cliTestsRepoRoot, "src", "jsx-dev-runtime.ts"),
    ),
  };
  denoConfig.tasks = {
    ...(denoConfig.tasks ?? {}),
    mainz: `deno run -A --config deno.json ${
      toFileSpecifier(resolve(cliTestsRepoRoot, "src", "public", "tooling-cli.ts"))
    }`,
  };

  await Deno.writeTextFile(
    denoJsonPath,
    `${JSON.stringify(denoConfig, null, 4)}\n`,
  );
}

async function rewireNodeProjectToLocalTooling(projectDir: string): Promise<void> {
  const packageJsonPath = resolve(projectDir, "package.json");
  const packageJson = JSON.parse(
    await Deno.readTextFile(packageJsonPath),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  const dependencies = { ...(packageJson.dependencies ?? {}) };
  delete dependencies.mainz;

  packageJson.dependencies = dependencies;
  packageJson.devDependencies = {
    ...(packageJson.devDependencies ?? {}),
    "happy-dom": "20.9.0",
    "tsx": "4.22.4",
    "typescript": "5.9.3",
  };
  packageJson.scripts = {
    ...(packageJson.scripts ?? {}),
    mainz: "tsx ./scripts/mainz.mjs",
  };

  await Deno.writeTextFile(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
}

function toFileSpecifier(path: string): string {
  return pathToFileURL(path).href;
}

async function assertPathMissing(path: string): Promise<void> {
  try {
    await Deno.stat(path);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return;
    }
    throw error;
  }

  throw new Error(`Expected path to be removed: ${path}`);
}

async function writeDockerSpy(directory: string, dockerArgsPath: string): Promise<void> {
  await Deno.writeTextFile(
    resolve(directory, "docker.cmd"),
    [
      "@echo off",
      "if /I [%~1]==[ps] (",
      "  exit /b 0",
      ")",
      `echo %*>>"${dockerArgsPath}"`,
      "exit /b 0",
      "",
    ].join("\r\n"),
  );

  const posixPath = resolve(directory, "docker");
  await Deno.writeTextFile(
    posixPath,
    [
      "#!/bin/sh",
      "if [ \"$1\" = \"ps\" ]; then",
      "  exit 0",
      "fi",
      `printf '%s\n' \"$*\" >> ${JSON.stringify(dockerArgsPath)}`,
      "exit 0",
    ].join("\n"),
  );
  await Deno.chmod(posixPath, 0o755);
}

function normalizeDockerArgs(content: string): string {
  return content.replaceAll('"', "");
}

async function assertLauncherRejectsMissingTarget(
  run: () => Promise<{ code: number; stdout: string; stderr: string }>,
  target: string,
): Promise<void> {
  await assertLauncherRejectsWithMessage(
    run,
    `No targets matched "${target}".`,
  );
}

async function assertLauncherRejectsWithMessage(
  run: () => Promise<{ code: number; stdout: string; stderr: string }>,
  message: string,
): Promise<void> {
  const result = await run();
  assertEquals(
    result.code,
    1,
    `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assertStringIncludes(result.stderr, message);
}

async function installNodeMainzShim(projectDir: string): Promise<void> {
  const packageRoot = resolve(projectDir, "node_modules", "mainz");
  await Deno.mkdir(packageRoot, { recursive: true });
  await copyTree(resolve(cliTestsRepoRoot, "src"), resolve(packageRoot, "src"));
  await Deno.copyFile(
    resolve(cliTestsRepoRoot, "mod.ts"),
    resolve(packageRoot, "mod.ts"),
  );
  await Deno.copyFile(
    resolve(cliTestsRepoRoot, "mod.js"),
    resolve(packageRoot, "mod.js"),
  );
  await Deno.writeTextFile(
    resolve(packageRoot, "src", "compiler", "typescript.ts"),
    'export { default as ts } from "typescript";\n',
  );
  await rewriteNodeShimSpecifiers(packageRoot);

  await Deno.writeTextFile(
    resolve(packageRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "mainz",
        private: true,
        type: "module",
        exports: {
          ".": "./mod.js",
          "./config": "./src/public/config.js",
          "./jsx-runtime": "./src/jsx-runtime.js",
          "./jsx-dev-runtime": "./src/jsx-dev-runtime.js",
          "./tooling/cli": "./src/public/tooling-cli.js",
        },
      },
      null,
      2,
    )}\n`,
  );
}

async function rewriteNodeShimSpecifiers(packageRoot: string): Promise<void> {
  // The local shim copies Mainz source directly into node_modules for Node-only
  // integration tests, so Deno-only npm: specifiers must be rewritten.
  const fileRewrites = [
    {
      path: resolve(packageRoot, "src", "tooling", "runtime", "node.ts"),
      replacements: nodeShimSpecifierRewrites,
    },
  ] as const;

  for (const fileRewrite of fileRewrites) {
    let source = await Deno.readTextFile(fileRewrite.path);
    for (const [from, to] of fileRewrite.replacements) {
      source = source.replaceAll(from, to);
    }
    await Deno.writeTextFile(fileRewrite.path, source);
  }
}

async function copyTree(sourceDir: string, destinationDir: string): Promise<void> {
  await Deno.mkdir(destinationDir, { recursive: true });

  for await (const entry of Deno.readDir(sourceDir)) {
    const sourcePath = resolve(sourceDir, entry.name);
    const destinationPath = resolve(destinationDir, entry.name);

    if (entry.isDirectory) {
      await copyTree(sourcePath, destinationPath);
      continue;
    }

    if (entry.isFile) {
      await Deno.copyFile(sourcePath, destinationPath);
    }
  }
}
