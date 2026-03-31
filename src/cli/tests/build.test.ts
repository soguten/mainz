/// <reference lib="deno.ns" />

import { resolve } from "node:path";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { normalizeMainzConfig } from "../../config/index.ts";
import { resolveBuildJobs } from "../build.ts";
import {
    cliTestsRepoRoot,
    createCliFixtureTargetConfig,
} from "../../../tests/helpers/test-helpers.ts";

Deno.test("cli/build: should create full matrix when target and mode are omitted", async () => {
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

    const jobs = await resolveBuildJobs(config, {});

    assertEquals(
        jobs.map((job) => `${job.target.name}:${job.mode}`),
        [
            "site:csr",
            "site:ssg",
            "playground:csr",
        ],
    );
});

Deno.test("cli/build: should filter jobs by target and mode", async () => {
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

    const jobs = await resolveBuildJobs(config, {
        target: "site",
        mode: "ssg",
    });

    assertEquals(jobs.length, 1);
    assertEquals(jobs[0].target.name, "site");
    assertEquals(jobs[0].mode, "ssg");
});

Deno.test("cli/build: should reject unknown render mode filters", async () => {
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

    await assertRejects(
        async () => {
            await resolveBuildJobs(config, {
                target: "site",
                mode: "spa",
            });
        },
        Error,
        'No render modes matched "spa"',
    );
});

Deno.test("cli/build: should fail for unknown target", async () => {
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

    await assertRejects(
        async () => {
            await resolveBuildJobs(config, { target: "unknown" });
        },
        Error,
        "No targets matched",
    );
});

Deno.test("cli/build: should skip ssg jobs for app-only targets with no routes or pages", async () => {
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

    const jobs = await resolveBuildJobs(config, {});

    assertEquals(jobs.map((job) => `${job.target.name}:${job.mode}`), [
        "playground:csr",
    ]);
});

Deno.test("cli/build: should fail when ssg is requested for an app-only target", async () => {
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

    await assertRejects(
        async () => {
            await resolveBuildJobs(config, {
                target: "playground",
                mode: "ssg",
            });
        },
        Error,
        "only supports csr app builds",
    );
});

Deno.test("cli/build: should include ssg jobs for routed app targets discovered from main.tsx without pagesDir", async () => {
    const fixtureRoot = resolve(cliTestsRepoRoot, "tests", "fixtures", "entries-di-build");
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "entries-di-build",
                rootDir: fixtureRoot,
                viteConfig: resolve(fixtureRoot, "vite.config.ts"),
            },
        ],
        render: {
            modes: ["csr", "ssg"],
        },
    });

    const jobs = await resolveBuildJobs(config, {});

    assertEquals(jobs.map((job) => `${job.target.name}:${job.mode}`), [
        "entries-di-build:csr",
        "entries-di-build:ssg",
    ]);
});

Deno.test("cli/build: should include ssg jobs when main.tsx imports a default-exported routed app definition", async () => {
    const fixtureRoot = resolve(
        cliTestsRepoRoot,
        "tests",
        "fixtures",
        "diagnostics-di-imported-app",
    );
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "diagnostics-di-imported-app",
                rootDir: fixtureRoot,
                viteConfig: resolve(fixtureRoot, "vite.config.ts"),
            },
        ],
        render: {
            modes: ["csr", "ssg"],
        },
    });

    const jobs = await resolveBuildJobs(config, {});

    assertEquals(jobs.map((job) => `${job.target.name}:${job.mode}`), [
        "diagnostics-di-imported-app:csr",
        "diagnostics-di-imported-app:ssg",
    ]);
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
        assertStringIncludes(
            stdout + stderr,
            'Component "LivePreview" uses @RenderStrategy("forbidden-in-ssg") and cannot be rendered during SSG.',
        );
        assertStringIncludes(
            stdout + stderr,
            "Remove it from the SSG path or render this route in a non-SSG mode.",
        );
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("cli/build: should warn for ownership-based deferred placeholders without fallback during ssg prerender", async () => {
    const fixture = await createCliFixtureTargetConfig({
        fixtureName: "component-load-ssg-warnings-build",
        targetName: "component-load-ssg-warnings-build",
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
        const combinedOutput = stdout + stderr;

        assertEquals(result.code, 0);
        assertStringIncludes(
            combinedOutput,
            'SSG prerender warning for route "/" and output "/" (locale "en"): Component "DeferredWithoutFallback" uses @RenderStrategy("deferred") without a fallback. Add a fallback to make the component\'s async placeholder explicit.',
        );
        assertEquals(
            combinedOutput.match(
                /SSG prerender warning for route "\/" and output "\/" \(locale "en"\):/g,
            )?.length ?? 0,
            1,
        );

        const html = await Deno.readTextFile(resolve(fixture.outputDir, "ssg", "index.html"));
        assertStringIncludes(html, "Component Load SSG Warnings");
        assertStringIncludes(html, "loading related docs");
        assertStringIncludes(html, "loading recent docs");
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("cli/build: should resolve dynamic entries() under the build-time app service container", async () => {
    const fixture = await createCliFixtureTargetConfig({
        fixtureName: "entries-di-build",
        targetName: "entries-di-build",
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

        assertEquals(result.code, 0, `stdout:\n${stdout}\nstderr:\n${stderr}`);

        const html = await Deno.readTextFile(
            resolve(
                fixture.outputDir,
                "ssg",
                "stories",
                "hello-from-di",
                "index.html",
            ),
        );
        assertStringIncludes(html, "Entries DI Build");
        assertStringIncludes(html, "hello-from-di");
        assertStringIncludes(html, "en");
    } finally {
        await fixture.cleanup();
    }
});
