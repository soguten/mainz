/// <reference lib="deno.ns" />

import { join } from "node:path";
import { pathToFileURL } from "node:url";
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

Deno.test("tooling/runtime/node: should execute Windows cmd wrappers without shell mode", async () => {
  if (Deno.build.os !== "windows") {
    return;
  }

  const runtime = new NodeToolingRuntime();
  const tempDir = await runtime.makeTempDir({ prefix: "mainz-cli-node-cmd-" });
  const scriptDir = join(tempDir, "cmd with space");
  const scriptPath = join(scriptDir, "write-marker.cmd");
  const markerPath = join(tempDir, "marker.txt");

  try {
    await runtime.mkdir(scriptDir, { recursive: true });
    await runtime.writeTextFile(
      scriptPath,
      [
        "@echo off",
        `echo ok> "${markerPath}"`,
        "",
      ].join("\r\n"),
    );

    const result = await runtime.run({
      command: scriptPath,
      stdout: "null",
      stderr: "null",
    });

    assertEquals(result, { success: true, code: 0 });
    assertEquals((await runtime.readTextFile(markerPath)).trim(), "ok");
  } finally {
    await runtime.remove(tempDir, { recursive: true });
  }
});

Deno.test("tooling/runtime/node: should import TypeScript modules with TSX dependencies", async () => {
  const runtime = new NodeToolingRuntime();
  const tempDir = await runtime.makeTempDir({ prefix: "mainz-cli-node-import-" });
  const helperPath = join(tempDir, "helper.tsx");
  const entryPath = join(tempDir, "entry.ts");

  try {
    await runtime.writeTextFile(
      join(tempDir, "package.json"),
      JSON.stringify({ type: "module" }),
    );
    await runtime.writeTextFile(
      helperPath,
      [
        'export function renderMessage(name: string): string {',
        '  return `hello ${name}`;',
        "}",
        "",
      ].join("\n"),
    );
    await runtime.writeTextFile(
      entryPath,
      [
        'import { renderMessage } from "./helper.tsx";',
        "",
        'export const message = renderMessage("mainz");',
        "",
      ].join("\n"),
    );

    const loaded = await runtime.importModule<{ message: string }>(
      pathToFileURL(entryPath).href,
    );
    assertEquals(loaded.message, "hello mainz");
  } finally {
    await runtime.remove(tempDir, { recursive: true });
  }
});

Deno.test("tooling/runtime/node: should import TypeScript modules with query strings and TSX dependencies", async () => {
  const runtime = new NodeToolingRuntime();
  const tempDir = await runtime.makeTempDir({
    prefix: "mainz-cli-node-import-query-",
  });
  const helperPath = join(tempDir, "helper.tsx");
  const entryPath = join(tempDir, "entry.ts");

  try {
    await runtime.writeTextFile(
      join(tempDir, "package.json"),
      JSON.stringify({ type: "module" }),
    );
    await runtime.writeTextFile(
      helperPath,
      [
        'export function renderMessage(name: string): string {',
        '  return `hello ${name}`;',
        "}",
        "",
      ].join("\n"),
    );
    await runtime.writeTextFile(
      entryPath,
      [
        'import { renderMessage } from "./helper.tsx";',
        "",
        'export const message = renderMessage("query");',
        "",
      ].join("\n"),
    );

    const loaded = await runtime.importModule<{ message: string }>(
      `${pathToFileURL(entryPath).href}?build-app=test`,
    );
    assertEquals(loaded.message, "hello query");
  } finally {
    await runtime.remove(tempDir, { recursive: true });
  }
});
