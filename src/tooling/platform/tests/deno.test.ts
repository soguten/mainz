/// <reference lib="deno.ns" />

import { join } from "node:path";
import { assertEquals } from "@std/assert";
import { DenoToolingPlatform } from "../index.ts";

Deno.test("tooling/platform/deno: should support basic filesystem operations", async () => {
    const platform = new DenoToolingPlatform();
    const tempDir = await platform.makeTempDir({ prefix: "mainz-platform-deno-" });
    const nestedDir = join(tempDir, "nested");
    const filePath = join(nestedDir, "note.txt");

    try {
        await platform.mkdir(nestedDir, { recursive: true });
        await platform.writeTextFile(filePath, "hello from platform");

        const content = await platform.readTextFile(filePath);
        const stat = await platform.stat(filePath);

        assertEquals(content, "hello from platform");
        assertEquals(stat.isFile, true);
        assertEquals(stat.isDirectory, false);
    } finally {
        await platform.remove(tempDir, { recursive: true });
    }
});

Deno.test("tooling/platform/deno: should run commands through the Deno host", async () => {
    const platform = new DenoToolingPlatform();

    const result = await platform.run({
        command: "deno",
        args: ["eval", "console.log('mainz-platform')"],
        stdout: "null",
        stderr: "null",
    });

    assertEquals(result.success, true);
    assertEquals(result.code, 0);
});
