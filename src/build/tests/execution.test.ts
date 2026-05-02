import { assertEquals } from "@std/assert";
import { assert, assertStringIncludes } from "@std/assert";
import { DenoToolingRuntime, NodeToolingRuntime } from "../../tooling/runtime/index.ts";
import { createGeneratedViteConfigDir } from "../vite-workspace.ts";

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
                "npm:vite@7.3.1",
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

Deno.test("build/execution: node runtime should keep generated Vite configs inside the workspace", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-node-vite-tempdir-" });

    try {
        const runtime = new NodeToolingRuntime();
        const tempDir = await createGeneratedViteConfigDir(cwd, runtime);

        assertEquals(
            tempDir.replaceAll("\\", "/"),
            `${cwd.replaceAll("\\", "/")}/node_modules/.mainz/vite`,
        );
        const stat = await Deno.stat(tempDir);
        assert(stat.isDirectory);
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});
