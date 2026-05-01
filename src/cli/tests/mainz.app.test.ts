/// <reference lib="deno.ns" />

import { delimiter, dirname, resolve } from "node:path";
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

Deno.test("cli/mainz init: should initialize a project in a named directory", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-init-named-" });

    try {
        const result = await runMainz(cwd, [
            "init",
            "demo",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);

        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
        assertStringIncludes(result.stdout, "Initialized Mainz project");

        const config = await Deno.readTextFile(resolve(cwd, "demo", "mainz.config.ts"));
        assertStringIncludes(config, 'runtime: "deno"');
        await assertRejectsNotFound(resolve(cwd, "mainz.config.ts"));
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz init: should initialize a deno starter project", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-init-starter-" });

    try {
        const result = await runMainz(cwd, [
            "init",
            "demo",
            "--template",
            "starter",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);

        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
        assertStringIncludes(result.stdout, "Initialized Mainz starter project");
        assertStringIncludes(result.stdout, 'Run "mainz dev --target app"');

        const config = await Deno.readTextFile(resolve(cwd, "demo", "mainz.config.ts"));
        assertStringIncludes(config, 'runtime: "deno"');
        assertStringIncludes(config, 'name: "app"');
        assertStringIncludes(config, 'rootDir: "./app"');
        assertStringIncludes(config, 'appFile: "./app/src/app.ts"');

        const appFile = await Deno.readTextFile(resolve(cwd, "demo", "app", "src", "app.ts"));
        assertStringIncludes(appFile, 'navigation: "enhanced-mpa"');
        assertStringIncludes(appFile, "pages: [HomePage]");

        const homePage = await Deno.readTextFile(
            resolve(cwd, "demo", "app", "src", "pages", "Home.page.tsx"),
        );
        assertStringIncludes(homePage, 'import { Counter } from "../components/Counter.tsx";');
        assertStringIncludes(homePage, "<Counter />");

        const counter = await Deno.readTextFile(
            resolve(cwd, "demo", "app", "src", "components", "Counter.tsx"),
        );
        assertStringIncludes(counter, 'import { Component } from "mainz";');
        assertEquals(counter.includes("@CustomElement"), false);
        assertStringIncludes(counter, "this.setState({ count: this.state.count + 1 })");

        const denoConfig = JSON.parse(
            await Deno.readTextFile(resolve(cwd, "demo", "deno.json")),
        ) as {
            imports?: Record<string, unknown>;
            tasks?: Record<string, unknown>;
        };
        assertEquals(denoConfig.imports?.mainz, "jsr:@mainz/mainz@0.1.0-alpha.99");
        assertEquals(
            denoConfig.tasks?.dev,
            "deno run -A --config deno.json jsr:@mainz/cli-deno@0.1.0-alpha.99 dev",
        );
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz init: should reject an unknown project template", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-init-template-unknown-" });

    try {
        const result = await runMainz(cwd, [
            "init",
            "--template",
            "missing",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);

        assertEquals(result.code, 1);
        assertStringIncludes(result.stderr, 'Project template "missing" was not found.');
        assertStringIncludes(result.stderr, "Available project templates: empty, starter.");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz init: should accept a local project template source", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-init-local-template-" });

    try {
        const templateDir = resolve(cwd, "project-template");
        await writeLocalProjectTemplate(templateDir);

        const result = await runMainz(cwd, [
            "init",
            "demo",
            "--template",
            "./project-template",
        ]);

        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const config = await Deno.readTextFile(resolve(cwd, "demo", "mainz.config.ts"));
        assertStringIncludes(config, "custom project template");
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

        const create = await runCreateRoutedApp(cwd, "docs");
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

Deno.test("cli/mainz init: should initialize a node starter project", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-init-node-starter-" });

    try {
        const result = await runMainz(cwd, [
            "init",
            "demo",
            "--template",
            "starter",
            "--runtime",
            "node",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);

        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const config = await Deno.readTextFile(resolve(cwd, "demo", "mainz.config.ts"));
        assertStringIncludes(config, 'runtime: "node"');
        assertStringIncludes(config, 'name: "app"');

        const packageJson = JSON.parse(
            await Deno.readTextFile(resolve(cwd, "demo", "package.json")),
        ) as {
            dependencies?: Record<string, unknown>;
            workspaces?: string[];
        };
        assertEquals(packageJson.dependencies?.mainz, "npm:@jsr/mainz__mainz@0.1.0-alpha.99");
        assertEquals(packageJson.workspaces, ["app"]);

        const homePage = await Deno.readTextFile(
            resolve(cwd, "demo", "app", "src", "pages", "Home.page.tsx"),
        );
        assertStringIncludes(homePage, "<Counter />");
        await assertRejectsNotFound(resolve(cwd, "demo", "deno.json"));
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
        assertStringIncludes(result.stdout, "mainz init [<name>] [--template <name|source>]");
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
                PATH: `${binDir}${delimiter}${dirname(Deno.execPath())}`,
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
                PATH: `${binDir}${delimiter}${dirname(Deno.execPath())}`,
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

        const create = await runCreateRoutedApp(cwd, "docs");
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

        const create = await runCreateRoutedApp(cwd, "site");
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
        const first = await runCreateRoutedApp(cwd, "site");
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

Deno.test("cli/mainz app: create should reject combining --template and --type", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-create-template-type-conflict-" });

    try {
        const result = await runMainz(cwd, [
            "app",
            "create",
            "docs",
            "--template",
            "default-routed",
            "--type",
            "root",
        ]);

        assertEquals(result.code, 1);
        assertStringIncludes(result.stderr, "cannot combine --template and --type");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: create should reject an unknown template", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-create-template-unknown-" });

    try {
        const result = await runMainz(cwd, [
            "app",
            "create",
            "docs",
            "--template",
            "missing",
        ]);

        assertEquals(result.code, 1);
        assertStringIncludes(result.stderr, 'App template "missing" was not found.');
        assertStringIncludes(
            result.stderr,
            "Available app templates: chart, default-root, default-routed.",
        );
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: create should apply template npm dependencies to deno app workspaces", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-create-chart-deno-" });

    try {
        const init = await runMainz(cwd, [
            "init",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);
        assertEquals(init.code, 0, `stdout:\n${init.stdout}\nstderr:\n${init.stderr}`);

        const result = await runMainz(cwd, [
            "app",
            "create",
            "analytics",
            "--template",
            "chart",
        ]);

        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const denoConfig = JSON.parse(await Deno.readTextFile(resolve(cwd, "deno.json"))) as {
            workspace?: string[];
        };
        assertEquals(denoConfig.workspace, ["./analytics"]);

        const appDenoConfig = JSON.parse(
            await Deno.readTextFile(resolve(cwd, "analytics", "deno.json")),
        ) as {
            imports?: Record<string, unknown>;
        };
        assertEquals(appDenoConfig.imports?.["chart.js"], "npm:chart.js@^4.5.1");
        assertEquals(appDenoConfig.imports?.["chart.js/"], undefined);
        await assertRejectsNotFound(resolve(cwd, "analytics", "package.json"));

        const homePage = await Deno.readTextFile(
            resolve(cwd, "analytics", "src", "pages", "Home.page.tsx"),
        );
        assertStringIncludes(homePage, "<ChartWidget");
        assertEquals(homePage.includes("@RenderMode"), false);
        assertEquals(homePage.includes("@CustomElement"), false);

        const appFile = await Deno.readTextFile(resolve(cwd, "analytics", "src", "app.ts"));
        assertStringIncludes(appFile, 'id: "analytics"');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: create should apply template npm dependencies to node app workspaces", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-create-chart-node-" });

    try {
        const init = await runMainz(cwd, [
            "init",
            "--runtime",
            "node",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);
        assertEquals(init.code, 0, `stdout:\n${init.stdout}\nstderr:\n${init.stderr}`);

        const result = await runMainz(cwd, [
            "app",
            "create",
            "analytics",
            "--template",
            "chart",
        ]);

        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const packageJson = JSON.parse(await Deno.readTextFile(resolve(cwd, "package.json"))) as {
            dependencies?: Record<string, unknown>;
            workspaces?: string[];
        };
        assertEquals(packageJson.dependencies?.["chart.js"], undefined);
        assertEquals(packageJson.workspaces, ["analytics"]);

        const appPackageJson = JSON.parse(
            await Deno.readTextFile(resolve(cwd, "analytics", "package.json")),
        ) as {
            dependencies?: Record<string, unknown>;
        };
        assertEquals(appPackageJson.dependencies?.["chart.js"], "^4.5.1");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: create should reject templates incompatible with the project runtime", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-create-template-runtime-" });

    try {
        const init = await runMainz(cwd, [
            "init",
            "--runtime",
            "node",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);
        assertEquals(init.code, 0, `stdout:\n${init.stdout}\nstderr:\n${init.stderr}`);

        const templateDir = resolve(cwd, "deno-only-template");
        await writeLocalAppTemplate(templateDir, {
            compatibility: {
                runtimes: ["deno"],
            },
        });

        const result = await runMainz(cwd, [
            "app",
            "create",
            "custom",
            "--template",
            "./deno-only-template",
        ]);

        assertEquals(result.code, 1);
        assertStringIncludes(result.stderr, 'not compatible with runtime "node"');
        await assertRejectsNotFound(resolve(cwd, "custom"));
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: create should accept a local app template source", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-create-local-template-" });

    try {
        const templateDir = resolve(cwd, "app-template");
        await writeLocalAppTemplate(templateDir);

        const result = await runMainz(cwd, [
            "app",
            "create",
            "custom",
            "--template",
            "./app-template",
        ]);

        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const appFile = await Deno.readTextFile(resolve(cwd, "custom", "src", "app.ts"));
        assertStringIncludes(appFile, "custom app template custom");

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertStringIncludes(config, 'name: "custom"');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: create should accept a remote app template source", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-create-remote-template-" });
    const archive = await createTarGz({
        "remote-template/template.json": JSON.stringify({
            kind: "app",
            name: "remote-app",
            target: {
                name: "{{appName}}",
                rootDir: "{{rootDir}}",
                appFile: "{{rootDir}}/src/app.ts",
                appId: "{{appId}}",
                outDir: "{{outDir}}",
            },
        }),
        "remote-template/files/index.html.tpl": '<main id="{{appId}}"></main>\n',
        "remote-template/files/src/app.ts.tpl": 'export const marker = "remote {{appName}}";\n',
    });
    const server = Deno.serve({
        hostname: "127.0.0.1",
        port: 0,
        onListen: () => {},
    }, (_request) => {
        return new Response(toArrayBuffer(archive), {
            headers: {
                "content-type": "application/gzip",
            },
        });
    });

    try {
        const result = await runMainz(cwd, [
            "app",
            "create",
            "remote",
            "--template",
            `http://127.0.0.1:${server.addr.port}/template.tar.gz`,
        ]);

        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const appFile = await Deno.readTextFile(resolve(cwd, "remote", "src", "app.ts"));
        assertStringIncludes(appFile, 'marker = "remote remote"');
    } finally {
        await server.shutdown();
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
            "--template",
            "default-routed",
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
        await runCreateRoutedApp(cwd, "site");
        await runCreateRoutedApp(cwd, "docs");

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
        await runCreateRoutedApp(cwd, "site");
        await runCreateRoutedApp(cwd, "docs");

        const result = await runMainz(cwd, ["app", "remove", "--target", "site"]);
        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assert(!config.includes('name: "site"'));
        assertStringIncludes(config, 'name: "docs"');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: remove should prune deno workspace entries", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-remove-deno-workspace-" });

    try {
        const init = await runMainz(cwd, [
            "init",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);
        assertEquals(init.code, 0, `stdout:\n${init.stdout}\nstderr:\n${init.stderr}`);

        const createChart = await runMainz(cwd, [
            "app",
            "create",
            "analytics",
            "--template",
            "chart",
        ]);
        assertEquals(
            createChart.code,
            0,
            `stdout:\n${createChart.stdout}\nstderr:\n${createChart.stderr}`,
        );

        const createDocs = await runMainz(cwd, ["app", "create", "docs"]);
        assertEquals(
            createDocs.code,
            0,
            `stdout:\n${createDocs.stdout}\nstderr:\n${createDocs.stderr}`,
        );

        const result = await runMainz(cwd, ["app", "remove", "--target", "analytics"]);
        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const denoConfig = JSON.parse(await Deno.readTextFile(resolve(cwd, "deno.json"))) as {
            workspace?: string[];
        };
        assertEquals(denoConfig.workspace, ["./docs"]);

        const appFile = await Deno.stat(resolve(cwd, "analytics", "src", "app.ts"));
        assert(appFile.isFile);
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
        await runCreateRoutedApp(cwd, "site");
        await runCreateRoutedApp(cwd, "docs");

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
        await runCreateRoutedApp(cwd, "site");
        await runCreateRoutedApp(cwd, "docs");

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

Deno.test("cli/mainz app: list should print configured targets as JSON", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-list-" });

    try {
        await runCreateRoutedApp(cwd, "site");
        await runCreateRoutedApp(cwd, "docs");

        const result = await runMainz(cwd, ["app", "list"]);
        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const entries = JSON.parse(result.stdout) as Array<{
            target: string;
            appId: string;
            rootDir: string;
            appFile: string;
            outDir: string;
        }>;
        assertEquals(entries.length, 2);
        assertEquals(entries[0]?.target, "site");
        assertEquals(entries[1]?.target, "docs");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz app: info should print one target as JSON", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-app-info-" });

    try {
        await runCreateRoutedApp(cwd, "site");

        const result = await runMainz(cwd, ["app", "info", "site"]);
        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const info = JSON.parse(result.stdout) as {
            target: string;
            appId: string;
            rootDir: string;
            appFile: string;
            outDir: string;
            vite: { source: string; configPath: string | null };
        };
        assertEquals(info.target, "site");
        assertEquals(info.appId, "site");
        assertEquals(info.rootDir, "./site");
        assertEquals(info.appFile, "./site/src/app.ts");
        assertEquals(info.outDir, "dist/site");
        assertEquals(info.vite.source, "generated");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz profile: create should create a target build config", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-profile-create-" });

    try {
        await runCreateRoutedApp(cwd, "site");

        const result = await runMainz(cwd, [
            "profile",
            "create",
            "gh-pages",
            "--target",
            "site",
            "--base-path",
            "/",
            "--site-url",
            "https://example.com",
        ]);
        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const buildConfig = await Deno.readTextFile(resolve(cwd, "site", "mainz.build.ts"));
        assertStringIncludes(buildConfig, 'import { defineTargetBuild } from "mainz/config";');
        assertStringIncludes(buildConfig, '"gh-pages": {');
        assertStringIncludes(buildConfig, 'basePath: "/"');
        assertStringIncludes(buildConfig, 'siteUrl: "https://example.com"');
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz workflow: create should generate one GitHub Pages workflow from gh-pages profiles", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-workflow-create-" });

    try {
        await runCreateRoutedApp(cwd, "site");
        await runCreateRoutedApp(cwd, "docs");
        await runMainz(cwd, [
            "profile",
            "create",
            "gh-pages",
            "--target",
            "site",
            "--base-path",
            "/",
        ]);
        await runMainz(cwd, [
            "profile",
            "create",
            "gh-pages",
            "--target",
            "docs",
            "--base-path",
            "/docs/",
        ]);

        const result = await runMainz(cwd, ["workflow", "create", "gh-pages"]);
        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const workflow = await Deno.readTextFile(
            resolve(cwd, ".github", "workflows", "deploy-github-pages.yml"),
        );
        assertStringIncludes(workflow, "name: Deploy to GitHub Pages");
        assertStringIncludes(workflow, "run: deno task build --target site --profile gh-pages");
        assertStringIncludes(workflow, "run: deno task build --target docs --profile gh-pages");
        assertStringIncludes(workflow, 'mkdir -p "$staging_dir/docs"');
        assertStringIncludes(
            workflow,
            "jsr:@mainz/cli-deno@alpha publish-info --target site --profile gh-pages",
        );
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz workflow: update should rewrite an existing GitHub Pages workflow", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-workflow-update-" });

    try {
        await runCreateRoutedApp(cwd, "site");
        await runMainz(cwd, [
            "profile",
            "create",
            "gh-pages",
            "--target",
            "site",
            "--base-path",
            "/",
        ]);
        await Deno.mkdir(resolve(cwd, ".github", "workflows"), { recursive: true });
        await Deno.writeTextFile(
            resolve(cwd, ".github", "workflows", "deploy-github-pages.yml"),
            "old workflow\n",
        );

        const result = await runMainz(cwd, [
            "workflow",
            "update",
            "gh-pages",
            "--branch",
            "release",
        ]);
        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

        const workflow = await Deno.readTextFile(
            resolve(cwd, ".github", "workflows", "deploy-github-pages.yml"),
        );
        assertStringIncludes(workflow, "            - release");
        assertEquals(workflow.includes("old workflow"), false);
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

async function runCreateRoutedApp(
    cwd: string,
    name: string,
): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    return await runMainz(cwd, ["app", "create", name]);
}

async function writeLocalProjectTemplate(templateDir: string): Promise<void> {
    await Deno.mkdir(resolve(templateDir, "files"), { recursive: true });
    await Deno.writeTextFile(
        resolve(templateDir, "template.json"),
        JSON.stringify(
            {
                kind: "project",
                name: "local-project",
            },
            null,
            4,
        ),
    );
    await Deno.writeTextFile(
        resolve(templateDir, "files", "mainz.config.ts.tpl"),
        [
            'import { defineMainzConfig } from "mainz/config";',
            "",
            "export default defineMainzConfig({",
            '    runtime: "deno",',
            "    // custom project template",
            "    targets: [],",
            "});",
            "",
        ].join("\n"),
    );
}

async function writeLocalAppTemplate(
    templateDir: string,
    manifestFields: Record<string, unknown> = {},
): Promise<void> {
    await Deno.mkdir(resolve(templateDir, "files", "src"), { recursive: true });
    await Deno.writeTextFile(
        resolve(templateDir, "template.json"),
        JSON.stringify(
            {
                kind: "app",
                name: "local-app",
                ...manifestFields,
                target: {
                    name: "{{appName}}",
                    rootDir: "{{rootDir}}",
                    appFile: "{{rootDir}}/src/app.ts",
                    appId: "{{appId}}",
                    outDir: "{{outDir}}",
                },
            },
            null,
            4,
        ),
    );
    await Deno.writeTextFile(
        resolve(templateDir, "files", "index.html.tpl"),
        '<main id="{{appId}}"></main>\n',
    );
    await Deno.writeTextFile(
        resolve(templateDir, "files", "src", "app.ts.tpl"),
        'export const marker = "custom app template {{appName}}";\n',
    );
}

async function createTarGz(files: Record<string, string>): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    const encoder = new TextEncoder();

    for (const [path, content] of Object.entries(files)) {
        const contentBytes = encoder.encode(content);
        chunks.push(createTarHeader(path, contentBytes.length));
        chunks.push(contentBytes);
        chunks.push(new Uint8Array(paddedTarSize(contentBytes.length) - contentBytes.length));
    }

    chunks.push(new Uint8Array(1024));

    const tarBytes = concatBytes(chunks);
    const stream = new Blob([toArrayBuffer(tarBytes)]).stream().pipeThrough(
        new CompressionStream("gzip"),
    );
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

function createTarHeader(path: string, size: number): Uint8Array {
    const header = new Uint8Array(512);
    writeTarString(header, 0, 100, path);
    writeTarString(header, 100, 8, "0000644");
    writeTarString(header, 108, 8, "0000000");
    writeTarString(header, 116, 8, "0000000");
    writeTarString(header, 124, 12, size.toString(8).padStart(11, "0"));
    writeTarString(header, 136, 12, "00000000000");
    header.fill(32, 148, 156);
    writeTarString(header, 156, 1, "0");
    writeTarString(header, 257, 6, "ustar");
    writeTarString(header, 263, 2, "00");

    const checksum = header.reduce((total, byte) => total + byte, 0);
    writeTarString(header, 148, 8, checksum.toString(8).padStart(6, "0"));
    header[154] = 0;
    header[155] = 32;

    return header;
}

function writeTarString(target: Uint8Array, offset: number, length: number, value: string): void {
    const bytes = new TextEncoder().encode(value);
    target.set(bytes.subarray(0, length), offset);
}

function paddedTarSize(size: number): number {
    return Math.ceil(size / 512) * 512;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
    const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return result;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
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
