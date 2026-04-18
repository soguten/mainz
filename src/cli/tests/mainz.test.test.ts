/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test("cli/mainz: test should reject suite options as project-specific", async () => {
    const command = new Deno.Command("deno", {
        args: [
            "run",
            "-A",
            "./src/cli/mainz.ts",
            "test",
            "--suite",
            "unknown",
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
    assertStringIncludes(stderr, 'Unknown option "--suite".');
    assertStringIncludes(stderr, "Test suites are project-specific");
});

Deno.test("cli/mainz: test should reject unknown targets", async () => {
    const command = new Deno.Command("deno", {
        args: [
            "run",
            "-A",
            "./src/cli/mainz.ts",
            "test",
            "--target",
            "missing-target",
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
    assertStringIncludes(stderr, 'No targets matched "missing-target".');
});
