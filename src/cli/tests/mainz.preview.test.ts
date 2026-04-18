/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test("cli/mainz: preview should require a target", async () => {
    const result = await runMainzPreviewCommand([]);

    assertEquals(result.code, 1);
    assertEquals(result.stdout, "");
    assertStringIncludes(result.stderr, 'Command "preview" requires a single --target <name>.');
});

Deno.test("cli/mainz: preview should reject navigation overrides", async () => {
    const result = await runMainzPreviewCommand([
        "--target",
        "site",
        "--navigation",
        "spa",
    ]);

    assertEquals(result.code, 1);
    assertEquals(result.stdout, "");
    assertStringIncludes(result.stderr, 'Command "preview" no longer accepts --navigation.');
});

Deno.test("cli/mainz: preview should validate port", async () => {
    const result = await runMainzPreviewCommand([
        "--target",
        "site",
        "--port",
        "nope",
    ]);

    assertEquals(result.code, 1);
    assertEquals(result.stdout, "");
    assertStringIncludes(result.stderr, 'Invalid --port value "nope".');
});

async function runMainzPreviewCommand(args: readonly string[]): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    const command = new Deno.Command("deno", {
        args: [
            "run",
            "-A",
            "./src/cli/mainz.ts",
            "preview",
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
