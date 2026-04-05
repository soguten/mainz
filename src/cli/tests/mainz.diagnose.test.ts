/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createFixtureTargetConfig } from "../../../tests/helpers/fixture-config.ts";
import { runMainzCliCommand } from "../../../tests/helpers/cli.ts";

const cliTestsRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const decoder = new TextDecoder();

Deno.test("cli/mainz: diagnose should print an empty array when no route diagnostics are found", async () => {
    const { stdout } = await runMainzCliCommand(
        ["diagnose", "--target", "playground"],
        "diagnose failed for playground.",
    );

    assertEquals(JSON.parse(stdout), []);
});

Deno.test("cli/mainz: diagnose should support CI-friendly failure on errors", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-routes",
        targetName: "diagnostics-routes",
        locales: ["en"],
    });

    try {
        const command = new Deno.Command("deno", {
            args: [
                "run",
                "-A",
                "./src/cli/mainz.ts",
                "diagnose",
                "--config",
                fixture.configPath,
                "--target",
                fixture.targetName,
                "--fail-on",
                "error",
            ],
            cwd: cliTestsRepoRoot,
            stdout: "piped",
            stderr: "piped",
        });

        const result = await command.output();
        const stdout = decoder.decode(result.stdout);

        assertEquals(result.code, 1);
        assertStringIncludes(stdout, '"code": "dynamic-ssg-missing-entries"');
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("cli/mainz: diagnose should support CI-friendly failure on warnings", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-routes",
        targetName: "diagnostics-routes",
        locales: ["en"],
    });

    try {
        const command = new Deno.Command("deno", {
            args: [
                "run",
                "-A",
                "./src/cli/mainz.ts",
                "diagnose",
                "--config",
                fixture.configPath,
                "--target",
                fixture.targetName,
                "--fail-on",
                "warning",
            ],
            cwd: cliTestsRepoRoot,
            stdout: "piped",
            stderr: "piped",
        });

        const result = await command.output();
        const stdout = decoder.decode(result.stdout);

        assertEquals(result.code, 1);
        assertStringIncludes(stdout, '"code": "component-load-missing-fallback"');
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("cli/mainz: diagnose should support a human-readable format", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-routes",
        targetName: "diagnostics-routes",
        locales: ["en"],
    });

    try {
        const { stdout } = await runMainzCliCommand(
            [
                "diagnose",
                "--config",
                fixture.configPath,
                "--target",
                fixture.targetName,
                "--format",
                "human",
            ],
            "diagnose human output failed for diagnostics-routes fixture.",
        );

        assertStringIncludes(stdout, "Diagnostics summary:");
        assertStringIncludes(stdout, "Target: diagnostics-routes");
        assertStringIncludes(stdout, "error dynamic-ssg-missing-entries");
        assertStringIncludes(stdout, "route: /docs/:slug");
    } finally {
        await fixture.cleanup();
    }
});
