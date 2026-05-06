import { resolve } from "node:path";
import { assertEquals } from "@std/assert";
import { assert, assertStringIncludes } from "@std/assert";
import { DenoToolingRuntime, NodeToolingRuntime } from "../../tooling/runtime/index.ts";
import { resolveMainzTempPath } from "../../tooling/temp-paths.ts";
import {
    materializeGeneratedViteConfigFile,
    resolveGeneratedViteConfigArtifactDir,
} from "../vite-workspace.ts";

Deno.test("build/execution: should forward dev host and port to Vite", () => {
    const runtime = new DenoToolingRuntime();

    assertEquals(
        runtime.resolveViteDevCommand({
            viteConfigPath: "/tmp/vite.config.mjs",
            host: true,
            port: 4175,
        }),
        {
            command: "deno",
            args: [
                "run",
                "-A",
                "npm:vite@8.0.10",
                "--config",
                "/tmp/vite.config.mjs",
                "--host",
                "--port",
                "4175",
            ],
        },
    );
});

Deno.test("build/execution: node runtime should resolve Vite commands through npx", () => {
    const runtime = new NodeToolingRuntime();

    assertEquals(
        runtime.resolveViteBuildCommand({
            viteConfigPath: "/tmp/vite.config.mjs",
        }),
        {
            command: "npx",
            args: [
                "vite",
                "build",
                "--config",
                "/tmp/vite.config.mjs",
            ],
        },
    );

    assertEquals(
        runtime.resolveViteDevCommand({
            viteConfigPath: "/tmp/vite.config.mjs",
            host: "127.0.0.1",
            port: 4175,
        }),
        {
            command: "npx",
            args: [
                "vite",
                "--config",
                "/tmp/vite.config.mjs",
                "--host",
                "127.0.0.1",
                "--port",
                "4175",
            ],
        },
    );
});

Deno.test("build/execution: node runtime should keep generated Vite configs inside .mainz_temp", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-node-vite-tempdir-" });

    try {
        const runtime = new NodeToolingRuntime();
        const artifact = await materializeGeneratedViteConfigFile({
            artifactDir: resolveGeneratedViteConfigArtifactDir({
                cwd,
                targetName: "site",
                runtimeName: runtime.name,
            }),
            runtime,
            moduleSource: "// @mainz-generated-vite-config\nexport default {};",
        });

        assertEquals(
            artifact.path.replaceAll("\\", "/"),
            resolveMainzTempPath(cwd, "vite-configs", "site", "node", "vite.config.ts")
                .replaceAll("\\", "/"),
        );
        const stat = await Deno.stat(artifact.path);
        assert(stat.isFile);
        await assertRejectsNotFound(resolve(cwd, "site", "vite.config.ts"));
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/execution: deno runtime should keep generated Vite configs inside .mainz_temp", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-deno-vite-tempdir-" });

    try {
        const runtime = new DenoToolingRuntime();
        const artifact = await materializeGeneratedViteConfigFile({
            artifactDir: resolveGeneratedViteConfigArtifactDir({
                cwd,
                targetName: "site",
                runtimeName: runtime.name,
            }),
            runtime,
            moduleSource: "// @mainz-generated-vite-config\nexport default {};",
        });

        assertEquals(
            artifact.path.replaceAll("\\", "/"),
            resolveMainzTempPath(cwd, "vite-configs", "site", "deno", "vite.config.ts")
                .replaceAll("\\", "/"),
        );
        const stat = await Deno.stat(artifact.path);
        assert(stat.isFile);
        await assertRejectsNotFound(resolve(cwd, "site", "vite.config.ts"));
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/execution: should reuse the same generated Vite config artifact when inputs do not change", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-vite-cache-reuse-" });

    try {
        const runtime = new DenoToolingRuntime();
        const first = await materializeGeneratedViteConfigFile({
            artifactDir: resolveGeneratedViteConfigArtifactDir({
                cwd,
                targetName: "site",
                runtimeName: runtime.name,
            }),
            runtime,
            moduleSource: "// @mainz-generated-vite-config\nexport default { appType: 'spa' };",
        });
        const second = await materializeGeneratedViteConfigFile({
            artifactDir: resolveGeneratedViteConfigArtifactDir({
                cwd,
                targetName: "site",
                runtimeName: runtime.name,
            }),
            runtime,
            moduleSource: "// @mainz-generated-vite-config\nexport default { appType: 'spa' };",
        });

        assertEquals(second.path, first.path);
        assertEquals(second.fingerprint, first.fingerprint);
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/execution: should regenerate a distinct artifact when generated Vite inputs change", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-vite-cache-invalidate-" });

    try {
        const runtime = new DenoToolingRuntime();
        const first = await materializeGeneratedViteConfigFile({
            artifactDir: resolveGeneratedViteConfigArtifactDir({
                cwd,
                targetName: "site",
                runtimeName: runtime.name,
            }),
            runtime,
            moduleSource: "// @mainz-generated-vite-config\nexport default { appType: 'spa' };",
        });
        const second = await materializeGeneratedViteConfigFile({
            artifactDir: resolveGeneratedViteConfigArtifactDir({
                cwd,
                targetName: "site",
                runtimeName: runtime.name,
            }),
            runtime,
            moduleSource: "// @mainz-generated-vite-config\nexport default { appType: 'mpa' };",
        });

        assertEquals(second.path, first.path);
        assert(second.fingerprint !== first.fingerprint);
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/execution: should overwrite the managed workspace Vite config when generated inputs change", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-vite-cache-prune-" });

    try {
        const runtime = new DenoToolingRuntime();
        const artifactDir = resolveGeneratedViteConfigArtifactDir({
            cwd,
            targetName: "site",
            runtimeName: runtime.name,
        });
        const last = await materializeGeneratedViteConfigFile({
            artifactDir,
            runtime,
            moduleSource: "// @mainz-generated-vite-config\nexport default { step: 4 };",
        });

        assertEquals(
            await Deno.readTextFile(last.path),
            "// @mainz-generated-vite-config\nexport default { step: 4 };",
        );
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/execution: should refuse to overwrite an unmanaged managed-artifact Vite config", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-vite-unmanaged-artifact-" });

    try {
        const runtime = new DenoToolingRuntime();
        const artifactDir = resolveGeneratedViteConfigArtifactDir({
            cwd,
            targetName: "site",
            runtimeName: runtime.name,
        });
        await Deno.mkdir(artifactDir, { recursive: true });
        await Deno.writeTextFile(resolve(artifactDir, "vite.config.ts"), "export default {};");

        await assertRejectsWithMessage(
            () =>
                materializeGeneratedViteConfigFile({
                    artifactDir,
                    runtime,
                    moduleSource:
                        "// @mainz-generated-vite-config\nexport default { appType: 'spa' };",
                }),
            "Refusing to overwrite existing generated Vite config artifact",
        );
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

async function assertRejectsWithMessage(
    action: () => Promise<unknown>,
    expectedMessage: string,
): Promise<void> {
    try {
        await action();
    } catch (error) {
        assert(error instanceof Error);
        assertStringIncludes(error.message, expectedMessage);
        return;
    }

    throw new Error(`Expected error including: ${expectedMessage}`);
}

async function assertRejectsNotFound(path: string): Promise<void> {
    try {
        await Deno.stat(path);
    } catch (error) {
        assert(error instanceof Deno.errors.NotFound);
        return;
    }

    throw new Error(`Expected "${path}" to be absent.`);
}
