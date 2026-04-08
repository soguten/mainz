/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";
import { runMainzCliCommand } from "../../../tests/helpers/cli.ts";

Deno.test("cli/mainz: publish-info should print artifact metadata resolved from a target profile", async () => {
    const { stdout } = await runMainzCliCommand(
        ["publish-info", "--target", "site", "--profile", "gh-pages"],
        "publish-info failed.",
    );
    const metadata = JSON.parse(stdout);

    assertEquals(metadata.target, "site");
    assertEquals(metadata.profile, "gh-pages");
    assertEquals(metadata.outDir, "dist/site/ssg");
    assertEquals(metadata.basePath, "/");
    assertEquals(metadata.navigation, "enhanced-mpa");
});

Deno.test("cli/mainz: publish-info should reject legacy render overrides", async () => {
    const command = new Deno.Command("deno", {
        args: [
            "run",
            "-A",
            "./src/cli/mainz.ts",
            "publish-info",
            "--target",
            "site",
            "--mode",
            "csr",
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
    assertEquals(stderr.includes('Command "publish-info" no longer accepts --mode.'), true);
});
