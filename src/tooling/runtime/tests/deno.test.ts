/// <reference lib="deno.ns" />

import { join } from "node:path";
import { assertEquals } from "@std/assert";
import { DenoToolingRuntime } from "../index.ts";

Deno.test("tooling/runtime/deno: should support basic filesystem operations", async () => {
    const runtime = new DenoToolingRuntime();
    const tempDir = await runtime.makeTempDir({ prefix: "mainz-cli-deno-" });
    const nestedDir = join(tempDir, "nested");
    const filePath = join(nestedDir, "note.txt");

    try {
        await runtime.mkdir(nestedDir, { recursive: true });
        await runtime.writeTextFile(filePath, "hello from runtime");

        const content = await runtime.readTextFile(filePath);
        const stat = await runtime.stat(filePath);

        assertEquals(content, "hello from runtime");
        assertEquals(stat.isFile, true);
        assertEquals(stat.isDirectory, false);
    } finally {
        await runtime.remove(tempDir, { recursive: true });
    }
});

Deno.test("tooling/runtime/deno: should run commands through the Deno host", async () => {
    const runtime = new DenoToolingRuntime();

    const result = await runtime.run({
        command: "deno",
        args: ["eval", "console.log('mainz-runtime')"],
        stdout: "null",
        stderr: "null",
    });

    assertEquals(result.success, true);
    assertEquals(result.code, 0);
});
