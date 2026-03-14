/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const decoder = new TextDecoder();

Deno.test("cli/mainz: publish-info should print artifact metadata for a target profile", async () => {
    const command = new Deno.Command("deno", {
        args: [
            "run",
            "-A",
            "./src/cli/mainz.ts",
            "publish-info",
            "--target",
            "site",
            "--profile",
            "gh-pages",
        ],
        cwd: repoRoot,
        stdout: "piped",
        stderr: "piped",
    });

    const result = await command.output();
    if (!result.success) {
        throw new Error(`publish-info failed:\n${decoder.decode(result.stderr)}`);
    }

    const metadata = JSON.parse(decoder.decode(result.stdout));

    assertEquals(metadata.target, "site");
    assertEquals(metadata.profile, "gh-pages");
    assertEquals(metadata.artifactDir, "dist/site/ssg");
    assertEquals(metadata.basePath, "/mainz/");
    assertEquals(metadata.renderMode, "ssg");
});
