/// <reference lib="deno.ns" />

import { resolve } from "node:path";
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
            "deno run -A --config deno.json jsr:@mainz/mainz@0.1.0-alpha.99/cli dev",
        );
        assertEquals(
            denoConfig.tasks?.build,
            "deno run -A --config deno.json jsr:@mainz/mainz@0.1.0-alpha.99/cli build",
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

Deno.test("cli/mainz init: should initialize an empty node project with --runtime", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-init-node-" });

    try {
        const result = await runMainz(cwd, [
            "--runtime",
            "node",
            "init",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);

        assertEquals(result.code, 0, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
        assertStringIncludes(result.stdout, "Initialized Mainz project");

        const config = await Deno.readTextFile(resolve(cwd, "mainz.config.ts"));
        assertStringIncludes(config, 'runtime: "node"');

        const packageJson = JSON.parse(await Deno.readTextFile(resolve(cwd, "package.json"))) as {
            dependencies?: Record<string, string>;
            scripts?: Record<string, string>;
        };
        assertEquals(packageJson.dependencies?.mainz, "npm:@jsr/mainz__mainz@0.1.0-alpha.99");
        assertEquals(packageJson.scripts?.dev, "mainz dev");
        assertEquals(packageJson.scripts?.build, "mainz build");

        const npmrc = await Deno.readTextFile(resolve(cwd, ".npmrc"));
        assertStringIncludes(npmrc, "@jsr:registry=https://npm.jsr.io");

        const tsconfig = JSON.parse(await Deno.readTextFile(resolve(cwd, "tsconfig.json"))) as {
            compilerOptions?: Record<string, unknown>;
        };
        assertEquals(tsconfig.compilerOptions?.jsxImportSource, "mainz");

        await assertRejectsNotFound(resolve(cwd, "deno.json"));
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("cli/mainz init: should let app create keep node as the project runtime", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-init-node-app-create-" });

    try {
        const init = await runMainz(cwd, [
            "--runtime",
            "node",
            "init",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);
        assertEquals(init.code, 0, `stdout:\n${init.stdout}\nstderr:\n${init.stderr}`);

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
    options: { denoRunConfigPath?: string; noConfig?: boolean } = {},
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
