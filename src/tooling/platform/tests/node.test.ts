/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { NodeToolingPlatform } from "../index.ts";

Deno.test("tooling/platform/node: should resolve Vite build and dev commands through npx", () => {
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
