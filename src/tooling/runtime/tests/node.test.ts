/// <reference lib="deno.ns" />

import { join } from "node:path";
import { assertEquals } from "@std/assert";
import { NodeToolingRuntime } from "../index.ts";

Deno.test("tooling/runtime/node: should resolve Vite build and dev commands through npx", () => {
  const runtime = new NodeToolingRuntime();
  const expectedCommand = Deno.build.os === "windows" ? "npx.cmd" : "npx";

  assertEquals(
    runtime.resolveViteBuildCommand({
      viteConfigPath: "/tmp/vite.config.mjs",
    }),
    {
      command: expectedCommand,
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
      command: expectedCommand,
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

Deno.test("tooling/runtime/node: should support basic filesystem operations", async () => {
  const runtime = new NodeToolingRuntime();
  const tempDir = await runtime.makeTempDir({ prefix: "mainz-cli-node-" });
  const nestedDir = join(tempDir, "nested");
  const filePath = join(nestedDir, "note.txt");

  try {
    await runtime.mkdir(nestedDir, { recursive: true });
    await runtime.writeTextFile(filePath, "hello from runtime");

    const binary = await runtime.readFile(filePath);
    const content = await runtime.readTextFile(filePath);
    const stat = await runtime.stat(filePath);

    assertEquals(
      Array.from(binary),
      Array.from(new TextEncoder().encode("hello from runtime")),
    );
    assertEquals(content, "hello from runtime");
    assertEquals(stat.isFile, true);
    assertEquals(stat.isDirectory, false);
  } finally {
    await runtime.remove(tempDir, { recursive: true });
  }
});
