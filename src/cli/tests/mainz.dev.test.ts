/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test("cli/mainz: dev should accept host without a value", async () => {
    const result = await runMainzDevCommand([
        "--target",
        "missing-target",
        "--host",
    ]);

    assertEquals(result.code, 1);
    assertEquals(result.stdout, "");
    assertStringIncludes(result.stderr, 'No targets matched "missing-target".');
});

Deno.test("cli/mainz: dev should validate port", async () => {
    const result = await runMainzDevCommand([
        "--target",
        "site",
        "--port",
        "nope",
    ]);

    assertEquals(result.code, 1);
    assertEquals(result.stdout, "");
    assertStringIncludes(result.stderr, 'Invalid --port value "nope".');
});

Deno.test("cli/mainz: dev should accept global --platform before the command", async () => {
    const command = new Deno.Command("deno", {
        args: [
            "run",
            "-A",
            "./src/cli/mainz.ts",
            "--platform",
            "node",
            "dev",
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
    assertEquals(stderr.includes('Unknown command "--platform".'), false);
});

async function runMainzDevCommand(args: readonly string[]): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    const command = new Deno.Command("deno", {
        args: [
            "run",
            "-A",
            "./src/cli/mainz.ts",
            "dev",
            ...args,
        ],
        cwd: cliTestsRepoRoot,
        stdout: "piped",
        stderr: "piped",
    });

    const result = await command.output();
    const stdout = new TextDecoder().decode(result.stdout);
    const stderr = new TextDecoder().decode(result.stderr);

    return { code: result.code, stdout, stderr };
}
