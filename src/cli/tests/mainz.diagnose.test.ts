/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
    createCliFixtureTargetConfig,
    runMainzCliCommand,
} from "../../../tests/helpers/test-helpers.ts";

const cliTestsRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const decoder = new TextDecoder();

Deno.test("cli/mainz: diagnose should print an empty array when no route diagnostics are found", async () => {
    const { stdout } = await runMainzCliCommand(
        ["diagnose", "--target", "playground"],
        "diagnose failed for playground.",
    );

    assertEquals(JSON.parse(stdout), []);
});

Deno.test("cli/mainz: diagnose should print route diagnostics for a fixture target", async () => {
    const fixture = await createCliFixtureTargetConfig({
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
            ],
            "diagnose failed for diagnostics-routes fixture.",
        );

        assertEquals(
            sortDiagnostics(JSON.parse(stdout)),
            sortDiagnostics([
                {
                    target: "diagnostics-routes",
                    code: "component-load-missing-render-strategy",
                    severity: "error",
                    message:
                        'Component "MissingStrategyLoadOwner" declares load() but does not declare @RenderStrategy(...). ' +
                        "Component.load() requires a fixed component-level render strategy.",
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/components/BadComponentLoadOwner.tsx",
                    exportName: "MissingStrategyLoadOwner",
                },
                {
                    target: "diagnostics-routes",
                    code: "dynamic-ssg-missing-entries",
                    severity: "error",
                    message:
                        'SSG route "/docs/:slug" must define entries() to expand dynamic params.',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgWithoutEntriesPage",
                    routePath: "/docs/:slug",
                },
                {
                    target: "diagnostics-routes",
                    code: "dynamic-ssg-invalid-entries",
                    severity: "error",
                    message:
                        'entries() for dynamic SSG route "/tips/:slug" returned an invalid entry at index 0: Dynamic route "/tips/:slug" requires "slug"; these params is missing from entries().',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgInvalidEntriesHelperPage",
                    routePath: "/tips/:slug",
                },
                {
                    target: "diagnostics-routes",
                    code: "dynamic-ssg-invalid-entries",
                    severity: "error",
                    message:
                        'entries() for dynamic SSG route "/async/:slug" returned an invalid entry at index 0: Dynamic route "/async/:slug" requires "slug"; these params is missing from entries().',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgInvalidEntriesFromAsyncHelperPage",
                    routePath: "/async/:slug",
                },
                {
                    target: "diagnostics-routes",
                    code: "dynamic-ssg-invalid-entries",
                    severity: "error",
                    message:
                        'entries() for dynamic SSG route "/shared/:slug" returned an invalid entry at index 0: Dynamic route "/shared/:slug" requires "slug"; these params is missing from entries().',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgInvalidSharedParamsPage",
                    routePath: "/shared/:slug",
                },
                {
                    target: "diagnostics-routes",
                    code: "dynamic-ssg-invalid-entries",
                    severity: "error",
                    message:
                        'entries() for dynamic SSG route "/helper/:slug" returned an invalid entry at index 0: Dynamic route "/helper/:slug" requires "slug"; these params is missing from entries().',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgInvalidParamsHelperPage",
                    routePath: "/helper/:slug",
                },
                {
                    target: "diagnostics-routes",
                    code: "dynamic-ssg-invalid-entries",
                    severity: "error",
                    message:
                        'entries() for dynamic SSG route "/nested/:slug" returned an invalid entry at index 0: Dynamic route "/nested/:slug" requires "slug"; these params is missing from entries().',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgInvalidNestedParamsHelperPage",
                    routePath: "/nested/:slug",
                },
                {
                    target: "diagnostics-routes",
                    code: "dynamic-ssg-invalid-entries",
                    severity: "error",
                    message:
                        'entries() for dynamic SSG route "/entry-helper/:slug" returned an invalid entry at index 0: Dynamic route "/entry-helper/:slug" requires "slug"; these params is missing from entries().',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgInvalidEntryHelperPage",
                    routePath: "/entry-helper/:slug",
                },
                {
                    target: "diagnostics-routes",
                    code: "dynamic-ssg-invalid-entries",
                    severity: "error",
                    message:
                        'entries() for dynamic SSG route "/spread/:slug" returned an invalid entry at index 0: Dynamic route "/spread/:slug" requires "slug"; these params is missing from entries().',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgInvalidSpreadParamsPage",
                    routePath: "/spread/:slug",
                },
                {
                    target: "diagnostics-routes",
                    code: "dynamic-ssg-invalid-entries",
                    severity: "error",
                    message:
                        'entries() for dynamic SSG route "/shared-spread/:slug" returned an invalid entry at index 0: Dynamic route "/shared-spread/:slug" requires "slug"; these params is missing from entries().',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgInvalidSharedSpreadParamsPage",
                    routePath: "/shared-spread/:slug",
                },
                {
                    target: "diagnostics-routes",
                    code: "dynamic-ssg-invalid-entries",
                    severity: "error",
                    message:
                        'entries() for dynamic SSG route "/local-spread/:slug" returned an invalid entry at index 0: Dynamic route "/local-spread/:slug" requires "slug"; these params is missing from entries().',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgInvalidLocalSpreadAliasPage",
                    routePath: "/local-spread/:slug",
                },
                {
                    target: "diagnostics-routes",
                    code: "dynamic-ssg-invalid-entries",
                    severity: "error",
                    message:
                        'entries() for dynamic SSG route "/entries-ref/:slug" returned an invalid entry at index 0: Dynamic route "/entries-ref/:slug" requires "slug"; these params is missing from entries().',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgInvalidReferencedEntriesPage",
                    routePath: "/entries-ref/:slug",
                },
                {
                    target: "diagnostics-routes",
                    code: "component-load-missing-fallback",
                    severity: "warning",
                    message:
                        'Component "MissingFallbackLoadOwner" declares load() with @RenderStrategy("client-only") without a fallback. ' +
                        "Add a fallback to make the component's async placeholder explicit.",
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/components/BadComponentLoadOwner.tsx",
                    exportName: "MissingFallbackLoadOwner",
                },
                {
                    target: "diagnostics-routes",
                    code: "component-render-strategy-without-load",
                    severity: "warning",
                    message:
                        'Component "StrategyWithoutLoadOwner" declares @RenderStrategy("blocking") but does not declare load(). ' +
                        "@RenderStrategy(...) only affects Component.load() and has no effect on synchronous components.",
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/components/BadComponentLoadOwner.tsx",
                    exportName: "StrategyWithoutLoadOwner",
                },
                {
                    target: "diagnostics-routes",
                    code: "dynamic-ssg-missing-load",
                    severity: "warning",
                    message:
                        'Dynamic SSG route "/guides/:slug" defines entries() but no load(). This is valid when route params are sufficient to render, but consider load.byParam(...) or load.byParams(...) if the page repeats route lookups.',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgWithoutLoadPage",
                    routePath: "/guides/:slug",
                },
            ]),
        );
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("cli/mainz: diagnose should report invalid locale tags declared in @Locales(...)", async () => {
    const fixture = await createCliFixtureTargetConfig({
        fixtureName: "diagnostics-invalid-locales",
        targetName: "diagnostics-invalid-locales",
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
            ],
            "diagnose failed for diagnostics-invalid-locales fixture.",
        );

        assertEquals(JSON.parse(stdout), [
            {
                target: "diagnostics-invalid-locales",
                code: "invalid-locale-tag",
                severity: "error",
                message:
                    `Could not load page module "${
                        fixture.fixtureRoot.replaceAll("\\", "/")
                    }/src/pages/Home.page.tsx": ` +
                    '@Locales() received invalid locale "en--US" at index 0. ' +
                    'Invalid locale "en--US". Expected a valid BCP 47 language tag.',
                file: fixture.fixtureRoot.replaceAll("\\", "/") + "/src/pages/Home.page.tsx",
                exportName: "(page discovery)",
            },
        ]);
    } finally {
        await fixture.cleanup();
    }
});

function sortDiagnostics<
    T extends { target: string; code: string; exportName: string; routePath?: string },
>(
    diagnostics: readonly T[],
): T[] {
    return [...diagnostics].sort((a, b) => {
        if (a.target !== b.target) {
            return a.target.localeCompare(b.target);
        }

        if (a.code !== b.code) {
            return a.code.localeCompare(b.code);
        }

        if (a.exportName !== b.exportName) {
            return a.exportName.localeCompare(b.exportName);
        }

        return (a.routePath ?? "").localeCompare(b.routePath ?? "");
    });
}

Deno.test("cli/mainz: diagnose should support CI-friendly failure on errors", async () => {
    const fixture = await createCliFixtureTargetConfig({
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
    const fixture = await createCliFixtureTargetConfig({
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
    const fixture = await createCliFixtureTargetConfig({
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

        assertStringIncludes(stdout, "Diagnostics summary: 12 error(s), 3 warning(s)");
        assertStringIncludes(stdout, "Target: diagnostics-routes");
        assertStringIncludes(stdout, "error dynamic-ssg-missing-entries");
        assertStringIncludes(stdout, "error dynamic-ssg-invalid-entries");
        assertStringIncludes(stdout, "warning dynamic-ssg-missing-load");
        assertStringIncludes(stdout, "error component-load-missing-render-strategy");
        assertStringIncludes(stdout, "warning component-load-missing-fallback");
        assertStringIncludes(stdout, "warning component-render-strategy-without-load");
        assertStringIncludes(stdout, "MissingStrategyLoadOwner");
        assertStringIncludes(stdout, "route: /docs/:slug");
        assertStringIncludes(
            stdout,
            'SSG route "/docs/:slug" must define entries() to expand dynamic params.',
        );
    } finally {
        await fixture.cleanup();
    }
});
