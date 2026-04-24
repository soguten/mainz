/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { NodeToolingRuntime } from "../index.ts";

Deno.test("tooling/runtime/node: should resolve Vite build and dev commands through npx", () => {
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
