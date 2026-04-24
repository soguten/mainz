import { assertEquals } from "@std/assert";
import { assert, assertStringIncludes } from "@std/assert";
import { DenoToolingPlatform, NodeToolingPlatform } from "../../tooling/platform/index.ts";
import { createGeneratedViteConfigDir } from "../execution.ts";

Deno.test("build/execution: should forward dev host and port to Vite", () => {
    const platform = new DenoToolingPlatform();

    assertEquals(
        platform.resolveViteDevCommand({
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

Deno.test("build/execution: node platform should resolve Vite commands through npx", () => {
    const platform = new NodeToolingPlatform();

    assertEquals(
        platform.resolveViteBuildCommand({
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
        platform.resolveViteDevCommand({
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

Deno.test("build/execution: node platform should keep generated Vite configs inside the workspace", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-node-vite-tempdir-" });

    try {
        const platform = new NodeToolingPlatform();
        const tempDir = await createGeneratedViteConfigDir(cwd, platform);

        assertStringIncludes(tempDir.replaceAll("\\", "/"), `${cwd.replaceAll("\\", "/")}/.mainz/`);
        const stat = await Deno.stat(tempDir);
        assert(stat.isDirectory);
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});
