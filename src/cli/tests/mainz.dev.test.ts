/// <reference lib="deno.ns" />

import { resolve } from "node:path";
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

Deno.test("cli/mainz: dev should bootstrap node projects created by the CLI", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-node-dev-" });

    try {
        const init = await runMainzCommand(cwd, [
            "--platform",
            "node",
            "init",
            "--mainz",
            "jsr:@mainz/mainz@0.1.0-alpha.99",
        ]);
        assertEquals(init.code, 0, `stdout:\n${init.stdout}\nstderr:\n${init.stderr}`);

        const create = await runMainzCommand(cwd, ["app", "create", "site"]);
        assertEquals(create.code, 0, `stdout:\n${create.stdout}\nstderr:\n${create.stderr}`);

        const result = await runMainzCommand(cwd, [
            "dev",
            "--target",
            "missing-target",
        ]);

        assertEquals(result.code, 1);
        assertEquals(result.stdout, "");
        assertStringIncludes(result.stderr, 'No targets matched "missing-target".');
        assertEquals(result.stderr.includes('Import "mainz/config" not a dependency'), false);
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

async function runMainzDevCommand(args: readonly string[]): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    return await runMainzCommand(cliTestsRepoRoot, ["dev", ...args]);
}

async function runMainzCommand(cwd: string, args: readonly string[]): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    const command = new Deno.Command("deno", {
        args: [
            "run",
            "-A",
            resolve(cliTestsRepoRoot, "src", "cli", "mainz.ts"),
            ...args,
        ],
        cwd,
        stdout: "piped",
        stderr: "piped",
    });

    const result = await command.output();
    const stdout = new TextDecoder().decode(result.stdout);
    const stderr = new TextDecoder().decode(result.stderr);

    return { code: result.code, stdout, stderr };
}
