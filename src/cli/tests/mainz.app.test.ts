/// <reference lib="deno.ns" />

import { delimiter, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

const mainzCliPath = resolve(cliTestsRepoRoot, "src", "cli", "mainz.ts");

Deno.test("cli/mainz init: should initialize an empty project", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-init-" });

    try {
        const result = await runMainz(cwd, [
            "init",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);

        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
        assertStringIncludes(result.stdout, "Initialized Mainz project");

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertStringIncludes(config, 'import { defineMainzConfig } from "mainz/config";');
        assertStringIncludes(config, 'runtime: "deno"');
        assertStringIncludes(config, "targets: [");

        const denoConfig = JSON.parse(
            await Deno.readTextFile(resolve(cwd, "deno.json")),
        ) as {
            compilerOptions?: Record<string, unknown>;
            imports?: Record<string, unknown>;
            tasks?: Record<string, unknown>;
        };
        assertEquals(denoConfig.compilerOptions?.jsxImportSource, "mainz");
        assertEquals(denoConfig.imports?.mainz, "jsr:@mainz/mainz@0.1.0-alpha.99");
        assertEquals(
            denoConfig.imports?.["mainz/"],
            "jsr:/@mainz/mainz@0.1.0-alpha.99/",
        );
        assertEquals(
            denoConfig.tasks?.dev,
            "deno run -A --config deno.json jsr:@mainz/cli-deno@0.1.0-alpha.99 dev",
        );
        assertEquals(
            denoConfig.tasks?.build,
            "deno run -A --config deno.json jsr:@mainz/cli-deno@0.1.0-alpha.99 build",
        );
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz init: should let app create register the first target", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-init-app-create-" });

    try {
        const init = await runMainz(cwd, [
            "init",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);
        assertEquals(init.code, 0, `stdout:\n${init.stdout}\nstderr:\n${init.stderr}`);

        const create = await runMainz(cwd, ["app", "create", "docs"]);
        assertEquals(create.code, 0, `stdout:\n${create.stdout}\nstderr:\n${create.stderr}`);

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertStringIncludes(config, 'runtime: "deno"');
        assertStringIncludes(config, 'name: "docs"');
        assertStringIncludes(config, 'rootDir: "./docs"');
        assertStringIncludes(config, "    ],");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz init: should create a node project when --runtime node is passed", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-init-node-" });

    try {
        const result = await runMainz(cwd, [
            "init",
            "--runtime",
            "node",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);

        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertStringIncludes(config, 'runtime: "node"');

        const packageJson = await Deno.readTextFile(resolve(cwd, "package.json"));
        assertStringIncludes(
            packageJson,
            '"mainz": "npm:@jsr/mainz__mainz@0.1.0-alpha.99"',
        );
        await assertRejectsNotFound(resolve(cwd, "deno.json"));
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz init: should allow matching --cli before the command", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-init-cli-deno-node-" });

    try {
        const result = await runMainz(cwd, [
            "--cli",
            "deno",
            "init",
            "--runtime",
            "node",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);

        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertStringIncludes(config, 'runtime: "node"');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz: should print command help for init", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-help-init-" });

    try {
        const result = await runMainz(cwd, ["init", "--help"]);

        assertEquals(result.code, 0);
        assertStringIncludes(result.stdout, "Mainz CLI - init");
        assertStringIncludes(result.stdout, "mainz init [--runtime <deno|node|bun>]");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz: should delegate non-host --cli values to explicit CLI executables", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-cli-delegate-" });
    const binDir = await Deno.makeTempDir({ prefix: "mainz-cli-bin-" });

    try {
        const markerPath = resolve(cwd, "delegated.txt");
        await writeFakeCliExecutable(binDir, "mainz-cli-node", markerPath, 7);

        const result = await runMainz(cwd, ["--cli", "node", "init", "--runtime", "deno"], {
            env: {
                PATH: `${binDir}${delimiter}${Deno.env.get("PATH") ?? ""}`,
            },
        });

        assertEquals(result.code, 7);
        assertEquals((await Deno.readTextFile(markerPath)).trim(), "init --runtime deno");
    } finally {
        await Deno.remove(cwd, { recursive: true });
        await Deno.remove(binDir, { recursive: true });
    }
});

Deno.test("cli/mainz: should fallback to the runtime runner when the explicit CLI executable is missing", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-cli-delegate-runner-" });
    const binDir = await Deno.makeTempDir({ prefix: "mainz-cli-runner-bin-" });

    try {
        const markerPath = resolve(cwd, "delegated-runner.txt");
        await writeFakeCliExecutable(binDir, "npx", markerPath, 9);

        const result = await runMainz(cwd, ["--cli", "node", "init", "--runtime", "deno"], {
            env: {
                PATH: `${binDir}${delimiter}${Deno.env.get("PATH") ?? ""}`,
            },
        });

        assertEquals(result.code, 9);
        assertEquals(
            (await Deno.readTextFile(markerPath)).trim(),
            "-y @mainzjs/cli-node@alpha init --runtime deno",
        );
    } finally {
        await Deno.remove(cwd, { recursive: true });
        await Deno.remove(binDir, { recursive: true });
    }
});

Deno.test("cli/mainz: should reject unsupported --cli values softly", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-cli-unsupported-" });

    try {
        const result = await runMainz(cwd, ["--cli", "ruby", "init"]);

        assertEquals(result.code, 1);
        assertStringIncludes(result.stderr, 'Unsupported CLI "ruby"');
        assertStringIncludes(result.stderr, 'Run "mainz --help" for usage.');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz: should report unknown commands softly", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-unknown-command-" });

    try {
        const result = await runMainz(cwd, ["ship"]);

        assertEquals(result.code, 1);
        assertStringIncludes(result.stderr, 'Unknown command "ship"');
        assertStringIncludes(result.stderr, 'Run "mainz --help" for usage.');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: create should keep node as the project runtime in an existing node project", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-init-node-app-create-" });

    try {
        await Deno.writeTextFile(
            resolve(cwd, "mainz.config.ts"),
            [
                'import { defineMainzConfig } from "mainz/config";',
                "",
                "export default defineMainzConfig({",
                '    runtime: "node",',
                "    targets: [",
                "    ],",
                "});",
                "",
            ].join("\n"),
        );

        const create = await runMainz(cwd, ["app", "create", "docs"]);
        assertEquals(create.code, 0, `stdout:\n${create.stdout}\nstderr:\n${create.stderr}`);

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertStringIncludes(config, 'runtime: "node"');
        assertStringIncludes(config, 'name: "docs"');
        assertStringIncludes(config, 'rootDir: "./docs"');
        assertStringIncludes(config, "    ],");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz: global commands should bootstrap the project deno config", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-global-bootstrap-" });

    try {
        const init = await runMainz(cwd, [
            "init",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);
        assertEquals(init.code, 0, `stdout:\n${init.stdout}\nstderr:\n${init.stderr}`);

        const create = await runMainz(cwd, ["app", "create", "site"]);
        assertEquals(create.code, 0, `stdout:\n${create.stdout}\nstderr:\n${create.stderr}`);

        const denoConfigPath = resolve(cwd, "deno.json");
        const denoConfig = JSON.parse(await Deno.readTextFile(denoConfigPath)) as {
            imports?: Record<string, string>;
        };
        denoConfig.imports = {
            "@deno/vite-plugin": "npm:@deno/vite-plugin@2.0.2",
            "happy-dom": "npm:happy-dom@20.1.0",
            mainz: toFileSpecifier(resolve(cliTestsRepoRoot, "mod.ts")),
            "mainz/config": toFileSpecifier(resolve(cliTestsRepoRoot, "src", "config", "index.ts")),
            "mainz/jsx-dev-runtime": toFileSpecifier(
                resolve(cliTestsRepoRoot, "src", "jsx-dev-runtime.ts"),
            ),
            "mainz/jsx-runtime": toFileSpecifier(
                resolve(cliTestsRepoRoot, "src", "jsx-runtime.ts"),
            ),
            vite: "npm:vite@7.3.1",
        };
        await Deno.writeTextFile(denoConfigPath, JSON.stringify(denoConfig, null, 4));
        const bootstrapConfigPath = resolve(cwd, "mainz-cli-bootstrap.deno.json");
        await Deno.writeTextFile(
            bootstrapConfigPath,
            JSON.stringify(
                {
                    imports: {
                        "happy-dom": "npm:happy-dom@20.1.0",
                    },
                },
                null,
                4,
            ),
        );

        const result = await runMainz(
            cwd,
            ["diagnose", "--target", "site", "--format", "json", "--fail-on", "never"],
            { denoRunConfigPath: bootstrapConfigPath },
        );

        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
        assertStringIncludes(result.stdout, "[]");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz init: should refuse to overwrite existing project files", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-init-overwrite-" });

    try {
        await Deno.writeTextFile(resolve(cwd, "mainz.config.ts"), "export default {};\n");

        const result = await runMainz(cwd, [
            "init",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);

        assertEquals(result.code, 1);
        assertStringIncludes(result.stderr, "Refusing to overwrite existing file");

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertEquals(config, "export default {};\n");
        await assertRejectsNotFound(resolve(cwd, "deno.json"));
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: create should scaffold an app workspace and target", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-create-" });

    try {
        const result = await runMainz(cwd, [
            "app",
            "create",
            "docs",
        ]);

        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
        assertStringIncludes(result.stdout, 'Created app "docs"');

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertStringIncludes(config, 'import { defineMainzConfig } from "mainz/config";');
        assertStringIncludes(config, 'runtime: "deno"');
        assertStringIncludes(config, 'name: "docs"');
        assertStringIncludes(config, 'rootDir: "./docs"');
        assertStringIncludes(config, 'appFile: "./docs/src/app.ts"');
        assertStringIncludes(config, 'appId: "docs"');
        assertStringIncludes(config, 'outDir: "dist/docs"');
        assert(!config.includes("viteConfig"));

        const appFile = await Deno.readTextFile(resolve(cwd, "docs", "src", "app.ts"));
        assertStringIncludes(appFile, 'import { defineApp } from "mainz";');
        assertStringIncludes(appFile, 'navigation: "enhanced-mpa"');
        assertStringIncludes(appFile, "pages: [HomePage]");
        assertStringIncludes(appFile, "notFound: NotFoundPage");

        const mainFile = await Deno.readTextFile(resolve(cwd, "docs", "src", "main.tsx"));
        assertStringIncludes(mainFile, 'import { startApp } from "mainz";');
        assertStringIncludes(mainFile, "startApp(app");

        const homePage = await Deno.readTextFile(
            resolve(cwd, "docs", "src", "pages", "Home.page.tsx"),
        );
        assertStringIncludes(homePage, "export class HomePage extends Page");
        assertStringIncludes(homePage, "<h1>docs</h1>");

        const indexHtml = await Deno.readTextFile(resolve(cwd, "docs", "index.html"));
        assertStringIncludes(indexHtml, '<script type="module" src="/src/main.tsx"></script>');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: create should append a second app target", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-create-multi-" });

    try {
        const first = await runMainz(cwd, ["app", "create", "site"]);
        assertEquals(first.code, 0, `stdout:\n${first.stdout}\nstderr:\n${first.stderr}`);

        const second = await runMainz(cwd, [
            "app",
            "create",
            "admin",
            "--navigation",
            "spa",
        ]);
        assertEquals(second.code, 0, `stdout:\n${second.stdout}\nstderr:\n${second.stderr}`);

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertStringIncludes(config, 'name: "site"');
        assertStringIncludes(config, 'name: "admin"');
        assertStringIncludes(config, 'rootDir: "./admin"');

        const appFile = await Deno.readTextFile(resolve(cwd, "admin", "src", "app.ts"));
        assertStringIncludes(appFile, 'navigation: "spa"');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: create should accept --name", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-create-name-" });

    try {
        const result = await runMainz(cwd, [
            "app",
            "create",
            "--name",
            "docs",
        ]);

        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertStringIncludes(config, 'name: "docs"');
        assertStringIncludes(config, 'rootDir: "./docs"');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: create should reject conflicting positional and flag names", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-create-name-conflict-" });

    try {
        const result = await runMainz(cwd, [
            "app",
            "create",
            "site",
            "--name",
            "docs",
        ]);

        assertEquals(result.code, 1);
        assertStringIncludes(result.stderr, 'received conflicting names "site" and "docs"');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: create should accept a custom output directory", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-create-out-dir-" });

    try {
        const result = await runMainz(cwd, [
            "app",
            "create",
            "docs",
            "--out-dir",
            "public/docs",
        ]);
        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertStringIncludes(config, 'outDir: "public/docs"');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: create --type root should scaffold a root app", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-create-root-" });

    try {
        const result = await runMainz(cwd, [
            "app",
            "create",
            "portal",
            "--type",
            "root",
        ]);
        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertStringIncludes(config, 'name: "portal"');
        assertStringIncludes(config, 'appFile: "./portal/src/app.ts"');
        assertStringIncludes(config, 'appId: "portal"');
        assert(!config.includes("pagesDir"));

        const rootFile = await Deno.readTextFile(resolve(cwd, "portal", "src", "AppRoot.tsx"));
        assertStringIncludes(rootFile, 'import { Component } from "mainz";');
        assertStringIncludes(rootFile, "export class AppRoot extends Component");
        assertStringIncludes(rootFile, "<h1>portal</h1>");
        assert(!rootFile.includes("CustomElement"));
        assert(!rootFile.includes("data-app-surface"));

        const appFile = await Deno.readTextFile(resolve(cwd, "portal", "src", "app.ts"));
        assertStringIncludes(appFile, 'import { defineApp } from "mainz";');
        assertStringIncludes(appFile, 'import { AppRoot } from "./AppRoot.tsx";');
        assertStringIncludes(appFile, "root: AppRoot");

        await assertRejectsNotFound(resolve(cwd, "portal", "src", "pages"));
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: remove should remove only the matching target", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-remove-" });

    try {
        await runMainz(cwd, ["app", "create", "site"]);
        await runMainz(cwd, ["app", "create", "docs"]);

        const result = await runMainz(cwd, ["app", "remove", "site"]);
        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
        assertStringIncludes(result.stdout, 'Removed app target "site"');

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assert(!config.includes('name: "site"'));
        assertStringIncludes(config, 'name: "docs"');

        const siteAppFile = await Deno.stat(resolve(cwd, "site", "src", "app.ts"));
        assert(siteAppFile.isFile);
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: remove should accept --target", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-remove-target-" });

    try {
        await runMainz(cwd, ["app", "create", "site"]);
        await runMainz(cwd, ["app", "create", "docs"]);

        const result = await runMainz(cwd, ["app", "remove", "--target", "site"]);
        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assert(!config.includes('name: "site"'));
        assertStringIncludes(config, 'name: "docs"');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: remove should reject conflicting positional and flag targets", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-remove-target-conflict-" });

    try {
        const result = await runMainz(cwd, [
            "app",
            "remove",
            "site",
            "--target",
            "docs",
        ]);

        assertEquals(result.code, 1);
        assertStringIncludes(result.stderr, 'received conflicting names "site" and "docs"');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: remove should keep config formatting when removing the last target", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-remove-last-" });

    try {
        await runMainz(cwd, ["app", "create", "site"]);
        await runMainz(cwd, ["app", "create", "docs"]);

        const result = await runMainz(cwd, ["app", "remove", "docs"]);
        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertStringIncludes(config, 'name: "site"');
        assert(!config.includes('name: "docs"'));
        assertStringIncludes(config, "    ],");
        assert(!config.includes("\n],"));
        assert(!config.includes("        ],"));
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: remove --delete-files should remove the app root", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-remove-files-" });

    try {
        await runMainz(cwd, ["app", "create", "site"]);
        await runMainz(cwd, ["app", "create", "docs"]);

        const result = await runMainz(cwd, ["app", "remove", "site", "--delete-files"]);
        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
        assertStringIncludes(result.stdout, 'Removed app target "site"');
        assertStringIncludes(result.stdout, 'Deleted app files for "site"');

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assert(!config.includes('name: "site"'));
        assertStringIncludes(config, 'name: "docs"');

        await assertRejectsNotFound(resolve(cwd, "site"));
        const docsAppFile = await Deno.stat(resolve(cwd, "docs", "src", "app.ts"));
        assert(docsAppFile.isFile);
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

async function runMainz(
    cwd: string,
    args: string[],
    options: {
        denoRunConfigPath?: string;
        env?: Record<string, string>;
        noConfig?: boolean;
    } = {},
): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    const denoArgs = [
        "run",
        "--no-lock",
        ...(options.noConfig ? ["--no-config"] : []),
        ...(options.denoRunConfigPath ? ["--config", options.denoRunConfigPath] : []),
        "-A",
        mainzCliPath,
        ...args,
    ];
    const command = new Deno.Command("deno", {
        args: denoArgs,
        cwd,
        env: options.env,
        stdout: "piped",
        stderr: "piped",
    });

    const result = await command.output();
    return {
        code: result.code,
        stdout: new TextDecoder().decode(result.stdout),
        stderr: new TextDecoder().decode(result.stderr),
    };
}

async function writeFakeCliExecutable(
    binDir: string,
    name: string,
    markerPath: string,
    exitCode: number,
): Promise<void> {
    if (Deno.build.os === "windows") {
        await Deno.writeTextFile(
            resolve(binDir, `${name}.cmd`),
            [
                "@echo off",
                `echo %*>${JSON.stringify(markerPath)}`,
                `exit /b ${exitCode}`,
            ].join("\r\n"),
        );
        return;
    }

    const path = resolve(binDir, name);
    await Deno.writeTextFile(
        path,
        [
            "#!/bin/sh",
            `printf '%s\\n' "$*" > ${JSON.stringify(markerPath)}`,
            `exit ${exitCode}`,
        ].join("\n"),
    );
    await Deno.chmod(path, 0o755);
}

function toFileSpecifier(path: string): string {
    return pathToFileURL(path).href;
}

async function assertRejectsNotFound(path: string): Promise<void> {
    try {
        await Deno.stat(path);
    } catch (error) {
        assert(error instanceof Deno.errors.NotFound);
        return;
    }

    throw new Error(`Expected path to be removed: ${path}`);
}
