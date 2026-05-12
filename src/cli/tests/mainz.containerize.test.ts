/// <reference lib="deno.ns" />

import { dirname, resolve } from "node:path";
import { assertStringIncludes } from "@std/assert";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";
import { createTestAppTargetConfig } from "../../../tests/helpers/test-app-config.ts";

Deno.test("cli/mainz: container init should initialize minimal profiles and generate a browser-only Dockerfile", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "entries-di-build",
    targetName: "entries-di-build",
  });

  try {
    const { stdout } = await runMainzCliCommand(
      dirname(testApp.configPath),
      [
        "container",
        "init",
        "--target",
        testApp.targetName,
        "--config",
        testApp.configPath,
      ],
      "container init failed.",
    );

    const buildConfig = await Deno.readTextFile(
      resolve(testApp.testAppRoot, "mainz.build.ts"),
    );
    const dockerfile = await Deno.readTextFile(
      resolve(testApp.testAppRoot, "Dockerfile"),
    );
    const dockerignore = await Deno.readTextFile(
      resolve(dirname(testApp.configPath), ".dockerignore"),
    );

    assertStringIncludes(stdout, 'Resolved profile "production"');
    assertStringIncludes(stdout, "Generated browser-only Dockerfile");
    assertStringIncludes(stdout, "Updated build-context ignore rules");
    assertStringIncludes(
      stdout,
      "Build from the target workspace with: docker image build -f Dockerfile ..",
    );
    assertStringIncludes(buildConfig, '"production": {');
    assertStringIncludes(buildConfig, '"development": {');
    assertStringIncludes(buildConfig, 'basePath: "/"');
    assertStringIncludes(buildConfig, "env: []");
    assertStringIncludes(dockerfile, "FROM denoland/deno:2.7.14 AS builder");
    assertStringIncludes(dockerfile, "FROM nginx:1.27-alpine");
    assertStringIncludes(
      dockerfile,
      `RUN deno task build --target "entries-di-build" --profile "production" --config ${
        JSON.stringify("mainz.test-app.config.ts")
      }`,
    );
    assertStringIncludes(
      dockerfile,
      "COPY --from=builder /workspace/dist/entries-di-build/browser/ /usr/share/nginx/html/",
    );
    assertStringIncludes(dockerfile, "listen 3000;");
    assertStringIncludes(dockerfile, "try_files \\$uri \\$uri/ /index.html;");
    assertStringIncludes(dockerfile, "EXPOSE 3000");
    assertStringIncludes(dockerignore, "node_modules/");
    assertStringIncludes(dockerignore, "dist/");
    assertStringIncludes(dockerignore, ".git/");
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("cli/mainz: container init should scaffold container files", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "entries-di-build",
    targetName: "entries-di-build-container-init",
  });

  try {
    const { stdout } = await runMainzCliCommand(
      dirname(testApp.configPath),
      [
        "container",
        "init",
        "--target",
        testApp.targetName,
        "--config",
        testApp.configPath,
      ],
      "container init failed.",
    );

    assertStringIncludes(stdout, 'Resolved profile "production"');
    assertStringIncludes(stdout, "Generated browser-only Dockerfile");
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("cli/mainz: container init should generate a server-capable Dockerfile for SSR targets", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "ssr-build-app",
    targetName: "ssr-build-app",
  });

  try {
    const { stdout } = await runMainzCliCommand(
      dirname(testApp.configPath),
      [
        "container",
        "init",
        "--target",
        testApp.targetName,
        "--config",
        testApp.configPath,
      ],
      "container init failed.",
    );

    const dockerfile = await Deno.readTextFile(
      resolve(testApp.testAppRoot, "Dockerfile"),
    );

    assertStringIncludes(stdout, "Generated server-capable Dockerfile");
    assertStringIncludes(dockerfile, "FROM denoland/deno:2.7.14 AS builder");
    assertStringIncludes(dockerfile, "FROM denoland/deno:2.7.14");
    assertStringIncludes(
      dockerfile,
      'CMD ["deno", "run", "-A", "./src/cli/preview-artifact.ts", "dist/ssr-build-app", "--host", "0.0.0.0", "--port", "3000"]',
    );
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("cli/mainz: container init should reject node server-capable targets until a node artifact adapter exists", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "ssr-build-app",
    targetName: "ssr-build-app-node",
  });

  try {
    await Deno.writeTextFile(
      testApp.configPath,
      [
        "export default {",
        '  runtime: "node",',
        "  targets: [",
        "    {",
        `      name: ${JSON.stringify(testApp.target.name)},`,
        `      rootDir: ${JSON.stringify(testApp.target.rootDir)},`,
        ...(testApp.target.viteConfig
          ? [`      viteConfig: ${JSON.stringify(testApp.target.viteConfig)},`]
          : []),
        ...(testApp.target.appFile
          ? [`      appFile: ${JSON.stringify(testApp.target.appFile)},`]
          : []),
        ...(testApp.target.buildConfig
          ? [
            `      buildConfig: ${JSON.stringify(testApp.target.buildConfig)},`,
          ]
          : []),
        `      outDir: ${JSON.stringify(testApp.target.outDir)},`,
        "    }",
        "  ]",
        "};",
        "",
      ].join("\n"),
    );

    await assertRejectsContainerInit(
      dirname(testApp.configPath),
      [
        "container",
        "init",
        "--target",
        testApp.targetName,
        "--config",
        testApp.configPath,
      ],
      "container init should fail for node server-capable targets.",
      'Target "ssr-build-app-node" publishes server/runtime artifacts, but Mainz does not yet provide a Node server adapter for container generation.',
    );
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("cli/mainz: container init should prefer development when production is absent", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "entries-di-build",
    targetName: "entries-di-build-dev-only",
  });

  try {
    await Deno.writeTextFile(
      resolve(testApp.testAppRoot, "mainz.build.ts"),
      [
        'import { defineTargetBuild } from "mainz/config";',
        "",
        "export default defineTargetBuild({",
        "    profiles: {",
        '        "development": {',
        '            basePath: "/",',
        '            env: ["PUBLIC_SITE_URL"],',
        "        },",
        "    },",
        "});",
        "",
      ].join("\n"),
    );

    const { stdout } = await runMainzCliCommand(
      dirname(testApp.configPath),
      [
        "container",
        "init",
        "--target",
        testApp.targetName,
        "--config",
        testApp.configPath,
      ],
      "container init failed.",
    );

    const dockerfile = await Deno.readTextFile(
      resolve(testApp.testAppRoot, "Dockerfile"),
    );

    assertStringIncludes(stdout, 'Resolved profile "development"');
    assertStringIncludes(
      dockerfile,
      'RUN deno task build --target "entries-di-build-dev-only" --profile "development"',
    );
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("cli/mainz: container init should resolve target-scoped environment files for the effective profile", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "entries-di-build",
    targetName: "entries-di-build-env",
  });

  try {
    await Deno.writeTextFile(
      resolve(testApp.testAppRoot, "mainz.build.ts"),
      [
        'import { defineTargetBuild } from "mainz/config";',
        "",
        "export default defineTargetBuild({",
        "    profiles: {",
        '        "production": {',
        '            basePath: "/",',
        '            env: ["DATABASE_URL", "PUBLIC_SITE_URL"],',
        "        },",
        "    },",
        "});",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      resolve(testApp.testAppRoot, ".env"),
      "DATABASE_URL=postgres://workspace\n",
    );
    await Deno.writeTextFile(
      resolve(testApp.testAppRoot, ".env.production"),
      "PUBLIC_SITE_URL=https://example.com\n",
    );

    const { stdout, stderr } = await runMainzCliCommand(
      dirname(testApp.configPath),
      [
        "container",
        "init",
        "--target",
        testApp.targetName,
        "--config",
        testApp.configPath,
      ],
      "container init failed.",
    );

    assertStringIncludes(
      stdout,
      'Resolved target-scoped environment files for profile "production": test-app/.env, test-app/.env.production.',
    );
    assertStringIncludes(
      stdout,
      'Resolved 2 environment key(s) declared by profile "production".',
    );
    assertStringIncludes(stderr, "");
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("cli/mainz: container init should warn when declared environment keys are missing", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "entries-di-build",
    targetName: "entries-di-build-missing-env",
  });

  try {
    await Deno.writeTextFile(
      resolve(testApp.testAppRoot, "mainz.build.ts"),
      [
        'import { defineTargetBuild } from "mainz/config";',
        "",
        "export default defineTargetBuild({",
        "    profiles: {",
        '        "production": {',
        '            basePath: "/",',
        '            env: ["DATABASE_URL", "AUTH_SECRET"],',
        "        },",
        "    },",
        "});",
        "",
      ].join("\n"),
    );
    await Deno.writeTextFile(
      resolve(testApp.testAppRoot, ".env"),
      "DATABASE_URL=postgres://workspace\n",
    );

    const { stdout, stderr } = await runMainzCliCommand(
      dirname(testApp.configPath),
      [
        "container",
        "init",
        "--target",
        testApp.targetName,
        "--config",
        testApp.configPath,
      ],
      "container init failed.",
    );

    assertStringIncludes(
      stdout,
      'Resolved target-scoped environment files for profile "production": test-app/.env.',
    );
    assertStringIncludes(
      stderr,
      'Missing environment keys declared by profile "production": AUTH_SECRET.',
    );
  } finally {
    await testApp.cleanup();
  }
});

Deno.test("cli/mainz: container build should invoke docker image build with the repository-root context", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "entries-di-build",
    targetName: "entries-di-build-container-build",
  });
  const dockerSpyDir = await Deno.makeTempDir({ prefix: "mainz-docker-spy-" });

  try {
    const dockerArgsPath = resolve(dockerSpyDir, "docker-args.txt");
    await Deno.writeTextFile(
      resolve(dockerSpyDir, "docker.cmd"),
      `@echo off\r\necho %*>>"${dockerArgsPath}"\r\nexit /b 0\r\n`,
    );

    const path = `${dockerSpyDir};${Deno.env.get("PATH") ?? ""}`;
    const { stdout } = await runMainzCliCommand(
      dirname(testApp.configPath),
      [
        "container",
        "build",
        "--target",
        testApp.targetName,
        "--config",
        testApp.configPath,
      ],
      "container build failed.",
      {
        env: {
          PATH: path,
        },
      },
    );

    const dockerArgs = await Deno.readTextFile(dockerArgsPath);
    assertStringIncludes(
      dockerArgs,
      '"image" "build"',
    );
    assertStringIncludes(
      dockerArgs,
      `"${resolve(testApp.testAppRoot, "Dockerfile").replaceAll("\\", "/")}"`,
    );
    assertStringIncludes(
      dockerArgs,
      `"${testApp.targetName}:local"`,
    );
    assertStringIncludes(
      stdout,
      `Built Docker image "${testApp.targetName}:local"`,
    );
  } finally {
    await Deno.remove(dockerSpyDir, { recursive: true });
    await testApp.cleanup();
  }
});

Deno.test("cli/mainz: container run should invoke docker run with Mainz port 3000 by default", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "entries-di-build",
    targetName: "entries-di-build-container-run",
  });
  const dockerSpyDir = await Deno.makeTempDir({ prefix: "mainz-docker-spy-" });

  try {
    const dockerArgsPath = resolve(dockerSpyDir, "docker-args.txt");
    await Deno.writeTextFile(
      resolve(dockerSpyDir, "docker.cmd"),
      `@echo off\r\necho %*>>"${dockerArgsPath}"\r\nexit /b 0\r\n`,
    );

    const path = `${dockerSpyDir};${Deno.env.get("PATH") ?? ""}`;
    const { stdout } = await runMainzCliCommand(
      dirname(testApp.configPath),
      [
        "container",
        "run",
        "--target",
        testApp.targetName,
        "--config",
        testApp.configPath,
      ],
      "container run failed.",
      {
        env: {
          PATH: path,
        },
      },
    );

    const dockerArgs = await Deno.readTextFile(dockerArgsPath);
    assertStringIncludes(
      dockerArgs,
      '"run" "--rm" "-p" "3000:3000"',
    );
    assertStringIncludes(
      dockerArgs,
      `"${testApp.targetName}:local"`,
    );
    assertStringIncludes(
      stdout,
      `Open http://localhost:3000/`,
    );
  } finally {
    await Deno.remove(dockerSpyDir, { recursive: true });
    await testApp.cleanup();
  }
});

Deno.test("cli/mainz: container run should use the next available port when 3000 is already in use", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "entries-di-build",
    targetName: "entries-di-build-container-run-port-fallback",
  });
  const dockerSpyDir = await Deno.makeTempDir({ prefix: "mainz-docker-spy-" });
  const listener = Deno.listen({ hostname: "0.0.0.0", port: 3000 });

  try {
    const dockerArgsPath = resolve(dockerSpyDir, "docker-args.txt");
    await Deno.writeTextFile(
      resolve(dockerSpyDir, "docker.cmd"),
      `@echo off\r\necho %*>>"${dockerArgsPath}"\r\nexit /b 0\r\n`,
    );

    const path = `${dockerSpyDir};${Deno.env.get("PATH") ?? ""}`;
    const { stdout } = await runMainzCliCommand(
      dirname(testApp.configPath),
      [
        "container",
        "run",
        "--target",
        testApp.targetName,
        "--config",
        testApp.configPath,
      ],
      "container run failed.",
      {
        env: {
          PATH: path,
        },
      },
    );

    const dockerArgs = await Deno.readTextFile(dockerArgsPath);
    assertStringIncludes(
      dockerArgs,
      '"run" "--rm" "-p" "3001:3000"',
    );
    assertStringIncludes(
      stdout,
      `Port 3000 is in use. Using 3001 instead`,
    );
    assertStringIncludes(
      stdout,
      `Open http://localhost:3001/`,
    );
  } finally {
    listener.close();
    await Deno.remove(dockerSpyDir, { recursive: true });
    await testApp.cleanup();
  }
});

Deno.test("cli/mainz: container run should skip ports already published by Docker", async () => {
  const testApp = await createTestAppTargetConfig({
    testAppName: "entries-di-build",
    targetName: "entries-di-build-container-run-docker-port-fallback",
  });
  const dockerSpyDir = await Deno.makeTempDir({ prefix: "mainz-docker-spy-" });

  try {
    const dockerArgsPath = resolve(dockerSpyDir, "docker-args.txt");
    await Deno.writeTextFile(
      resolve(dockerSpyDir, "docker.cmd"),
      [
        "@echo off",
        "if /I [%~1]==[ps] (",
        "  echo 0.0.0.0:3000-^>3000/tcp",
        "  exit /b 0",
        ")",
        `echo %*>>"${dockerArgsPath}"`,
        "exit /b 0",
        "",
      ].join("\r\n"),
    );

    const path = `${dockerSpyDir};${Deno.env.get("PATH") ?? ""}`;
    const { stdout } = await runMainzCliCommand(
      dirname(testApp.configPath),
      [
        "container",
        "run",
        "--target",
        testApp.targetName,
        "--config",
        testApp.configPath,
      ],
      "container run failed.",
      {
        env: {
          PATH: path,
        },
      },
    );

    const dockerArgs = await Deno.readTextFile(dockerArgsPath);
    assertStringIncludes(
      dockerArgs,
      '"run" "--rm" "-p" "3001:3000"',
    );
    assertStringIncludes(
      stdout,
      `Port 3000 is in use. Using 3001 instead`,
    );
    assertStringIncludes(
      stdout,
      `Open http://localhost:3001/`,
    );
  } finally {
    await Deno.remove(dockerSpyDir, { recursive: true });
    await testApp.cleanup();
  }
});

async function runMainzCliCommand(
  cwd: string,
  args: string[],
  errorMessage: string,
  options: { env?: Record<string, string> } = {},
): Promise<{ stdout: string; stderr: string }> {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      resolve(cliTestsRepoRoot, "src", "cli", "mainz.ts"),
      ...args,
    ],
    cwd,
    env: options.env,
    stdout: "piped",
    stderr: "piped",
  });
  const result = await command.output();
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);

  if (!result.success) {
    throw new Error(`${errorMessage}\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  }

  return { stdout, stderr };
}

async function assertRejectsContainerInit(
  cwd: string,
  args: string[],
  errorMessage: string,
  expectedMessage: string,
): Promise<void> {
  const command = new Deno.Command("deno", {
    args: [
      "run",
      "-A",
      resolve(cliTestsRepoRoot, "src", "cli", "mainz.ts"),
      ...args,
    ],
    cwd,
    stdout: "piped",
    stderr: "piped",
  });
  const result = await command.output();
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);

  if (result.success) {
    throw new Error(`${errorMessage}\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  }

  assertStringIncludes(stderr, expectedMessage);
}
