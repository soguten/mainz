/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { normalizeMainzConfig } from "../../config/index.ts";
import { resolveBuildJobs } from "../build.ts";
import { cliTestsRepoRoot, createCliFixtureTargetConfig } from "../../../tests/helpers/test-helpers.ts";

Deno.test("cli/build: should create full matrix when target and mode are omitted", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "site",
                rootDir: "./site",
                viteConfig: "./vite.config.site.ts",
                pagesDir: "./site/src/pages",
            },
            {
                name: "playground",
                rootDir: "./playground",
                viteConfig: "./vite.config.playground.ts",
            },
        ],
        render: {
            modes: ["csr", "ssg"],
        },
    });

    const jobs = resolveBuildJobs(config, {});

    assertEquals(
        jobs.map((job) => `${job.target.name}:${job.mode}`),
        [
            "site:csr",
            "site:ssg",
            "playground:csr",
        ],
    );
});

Deno.test("cli/build: should filter jobs by target and mode", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "site",
                rootDir: "./site",
                viteConfig: "./vite.config.site.ts",
                pagesDir: "./site/src/pages",
            },
            {
                name: "playground",
                rootDir: "./playground",
                viteConfig: "./vite.config.playground.ts",
            },
        ],
        render: {
            modes: ["csr", "ssg"],
        },
    });

    const jobs = resolveBuildJobs(config, {
        target: "site",
        mode: "ssg",
    });

    assertEquals(jobs.length, 1);
    assertEquals(jobs[0].target.name, "site");
    assertEquals(jobs[0].mode, "ssg");
});

Deno.test("cli/build: should reject unknown render mode filters", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "site",
                rootDir: "./site",
                viteConfig: "./vite.config.site.ts",
                pagesDir: "./site/src/pages",
            },
        ],
        render: {
            modes: ["csr", "ssg"],
        },
    });

    assertThrows(() => {
        resolveBuildJobs(config, {
            target: "site",
            mode: "spa",
        });
    }, Error, 'No render modes matched "spa"');
});

Deno.test("cli/build: should fail for unknown target", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "site",
                rootDir: "./site",
                viteConfig: "./vite.config.site.ts",
                pagesDir: "./site/src/pages",
            },
        ],
    });

    assertThrows(() => {
        resolveBuildJobs(config, { target: "unknown" });
    }, Error, "No targets matched");
});

Deno.test("cli/build: should skip ssg jobs for app-only targets with no routes or pages", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "playground",
                rootDir: "./playground",
                viteConfig: "./vite.config.playground.ts",
            },
        ],
        render: {
            modes: ["csr", "ssg"],
        },
    });

    const jobs = resolveBuildJobs(config, {});

    assertEquals(jobs.map((job) => `${job.target.name}:${job.mode}`), [
        "playground:csr",
    ]);
});

Deno.test("cli/build: should fail when ssg is requested for an app-only target", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "playground",
                rootDir: "./playground",
                viteConfig: "./vite.config.playground.ts",
            },
        ],
        render: {
            modes: ["csr", "ssg"],
        },
    });

    assertThrows(() => {
        resolveBuildJobs(config, {
            target: "playground",
            mode: "ssg",
        });
    }, Error, "only supports csr app builds");
});

Deno.test("cli/build: should fail the build when a forbidden-in-ssg component is prerendered", async () => {
    const fixture = await createCliFixtureTargetConfig({
        fixtureName: "forbidden-in-ssg-build",
        targetName: "forbidden-in-ssg-build",
        locales: ["en"],
    });

    try {
        const command = new Deno.Command("deno", {
            args: [
                "run",
                "-A",
                "./src/cli/mainz.ts",
                "build",
                "--config",
                fixture.configPath,
                "--target",
                fixture.targetName,
                "--mode",
                "ssg",
                "--navigation",
                "enhanced-mpa",
            ],
            cwd: cliTestsRepoRoot,
            stdout: "piped",
            stderr: "piped",
        });

        const result = await command.output();
        const stdout = new TextDecoder().decode(result.stdout);
        const stderr = new TextDecoder().decode(result.stderr);

        assertEquals(result.code, 1);
        assertStringIncludes(stdout + stderr, 'Failed to prerender SSG route "/"');
        assertStringIncludes(stdout + stderr, 'Resource "live-preview" is being read by a component marked forbidden-in-ssg and cannot be used during SSG.');
    } finally {
        await fixture.cleanup();
    }
});
