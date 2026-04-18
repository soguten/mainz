/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test("cli/mainz: dev should reject navigation overrides", async () => {
    const command = new Deno.Command("deno", {
        args: [
            "run",
            "-A",
            "./src/cli/mainz.ts",
            "dev",
            "--target",
            "site",
            "--navigation",
            "spa",
        ],
        cwd: cliTestsRepoRoot,
        stdout: "piped",
        stderr: "piped",
    });

    const result = await command.output();
    const stdout = new TextDecoder().decode(result.stdout);
    const stderr = new TextDecoder().decode(result.stderr);

    assertEquals(result.code, 1);
    assertEquals(stdout, "");
    assertStringIncludes(stderr, 'Command "dev" no longer accepts --navigation.');
});
