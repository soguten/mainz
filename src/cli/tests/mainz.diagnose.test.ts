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
                    code: "dynamic-ssg-missing-load",
                    severity: "warning",
                    message:
                        'Dynamic SSG route "/async/:slug" defines entries() but no instance page load(). This is valid when route params are sufficient to render, but consider load.byParam(...) or load.byParams(...) if the page repeats route lookups.',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgInvalidEntriesFromAsyncHelperPage",
                    routePath: "/async/:slug",
                },
                {
                    target: "diagnostics-routes",
                    code: "dynamic-ssg-missing-load",
                    severity: "warning",
                    message:
                        'Dynamic SSG route "/tips/:slug" defines entries() but no instance page load(). This is valid when route params are sufficient to render, but consider load.byParam(...) or load.byParams(...) if the page repeats route lookups.',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgInvalidEntriesHelperPage",
                    routePath: "/tips/:slug",
                },
                {
                    target: "diagnostics-routes",
                    code: "dynamic-ssg-missing-load",
                    severity: "warning",
                    message:
                        'Dynamic SSG route "/entry-helper/:slug" defines entries() but no instance page load(). This is valid when route params are sufficient to render, but consider load.byParam(...) or load.byParams(...) if the page repeats route lookups.',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgInvalidEntryHelperPage",
                    routePath: "/entry-helper/:slug",
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
                        'Dynamic SSG route "/guides/:slug" defines entries() but no instance page load(). This is valid when route params are sufficient to render, but consider load.byParam(...) or load.byParams(...) if the page repeats route lookups.',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "DynamicSsgWithoutLoadPage",
                    routePath: "/guides/:slug",
                },
                {
                    target: "diagnostics-routes",
                    code: "page-static-load-unsupported",
                    severity: "error",
                    message:
                        'Page "MixedLoadPage" declares static load(), which is no longer supported. Move that logic into the page instance load() lifecycle.',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "MixedLoadPage",
                    routePath: "/mixed",
                },
                {
                    target: "diagnostics-routes",
                    code: "page-static-load-unsupported",
                    severity: "error",
                    message:
                        'Page "LegacyStaticLoadPage" declares static load(), which is no longer supported. Move that logic into the page instance load() lifecycle.',
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/pages/Diagnostics.page.tsx",
                    exportName: "LegacyStaticLoadPage",
                    routePath: "/legacy",
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

Deno.test("cli/mainz: diagnose should report named authorization policies that are not declared in target config", async () => {
    const fixture = await createCliFixtureTargetConfig({
        fixtureName: "diagnostics-authorization-policies",
        targetName: "diagnostics-authorization-policies",
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
            "diagnose failed for diagnostics-authorization-policies fixture.",
        );

        assertEquals(JSON.parse(stdout), [
            {
                target: "diagnostics-authorization-policies",
                code: "authorization-policy-not-registered",
                severity: "error",
                message: 'Page "OrgPage" references @Authorize({ policy: "org-member" }), ' +
                    "but that policy name is not declared in target.authorization.policyNames for diagnostics.",
                file: fixture.fixtureRoot.replaceAll("\\", "/") + "/src/pages/Org.page.tsx",
                exportName: "OrgPage",
                routePath: "/org",
            },
        ]);
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("cli/mainz: diagnose should report app-level notFound pages that still define @Route(...)", async () => {
    const fixture = await createCliFixtureTargetConfig({
        fixtureName: "diagnostics-not-found-route",
        targetName: "diagnostics-not-found-route",
        locales: ["en"],
        omitPagesDir: true,
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
            "diagnose failed for diagnostics-not-found-route fixture.",
        );

        assertEquals(JSON.parse(stdout), [{
            target: "diagnostics-not-found-route",
            code: "not-found-must-not-define-route",
            severity: "error",
            message:
                'notFound page "InvalidNotFoundPage" must not define @Route(...). Register it only through defineApp({ notFound }).',
            file: fixture.fixtureRoot.replaceAll("\\", "/") + "/src/pages/NotFound.page.tsx",
            exportName: "InvalidNotFoundPage",
            routePath: "/404",
        }]);
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("cli/mainz: diagnose should report DI registry problems for the official services shape", async () => {
    const fixture = await createCliFixtureTargetConfig({
        fixtureName: "diagnostics-di",
        targetName: "diagnostics-di",
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
            "diagnose failed for diagnostics-di fixture.",
        );

        assertEquals(
            sortDiagnostics(JSON.parse(stdout)),
            sortDiagnostics([
                {
                    target: "diagnostics-di",
                    code: "di-service-dependency-not-registered",
                    severity: "error",
                    message:
                        'Service "NeedsMissingDependency" depends on "MissingDependency" in its registered service graph, ' +
                        "but that dependency is not registered in app startup services.",
                    file: fixture.fixtureRoot.replaceAll("\\", "/") + "/src/main.tsx",
                    exportName: "NeedsMissingDependency",
                },
                {
                    target: "diagnostics-di",
                    code: "di-token-not-registered",
                    severity: "error",
                    message: 'Class "DiInjectedCard" injects "MissingApi" with mainz/di, ' +
                        "but that token is not registered in app startup services.",
                    file: fixture.fixtureRoot.replaceAll("\\", "/") +
                        "/src/components/InjectedCard.tsx",
                    exportName: "DiInjectedCard",
                },
                {
                    target: "diagnostics-di",
                    code: "di-token-not-registered",
                    severity: "error",
                    message:
                        'Class "DiagnosticsDiFixturePage" injects "MissingApi" with mainz/di, ' +
                        "but that token is not registered in app startup services.",
                    file: fixture.fixtureRoot.replaceAll("\\", "/") + "/src/pages/Home.page.tsx",
                    exportName: "DiagnosticsDiFixturePage",
                    routePath: "/",
                },
                {
                    target: "diagnostics-di",
                    code: "di-registration-cycle",
                    severity: "error",
                    message: "Service registration cycle detected: CycleA -> CycleB -> CycleA.",
                    file: fixture.fixtureRoot.replaceAll("\\", "/") + "/src/main.tsx",
                    exportName: "CycleA",
                },
            ]),
        );
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("cli/mainz: diagnose should resolve DI services from an imported default app definition", async () => {
    const fixture = await createCliFixtureTargetConfig({
        fixtureName: "diagnostics-di-imported-app",
        targetName: "diagnostics-di-imported-app",
        locales: ["en"],
        omitPagesDir: true,
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
            "diagnose failed for diagnostics-di-imported-app fixture.",
        );

        assertEquals(JSON.parse(stdout), [
            {
                target: "diagnostics-di-imported-app",
                code: "di-service-dependency-not-registered",
                severity: "error",
                message:
                    'Service "NeedsMissingDependency" depends on "MissingDependency" in its registered service graph, ' +
                    "but that dependency is not registered in app startup services.",
                file: fixture.fixtureRoot.replaceAll("\\", "/") + "/src/app.ts",
                exportName: "NeedsMissingDependency",
            },
            {
                target: "diagnostics-di-imported-app",
                code: "di-token-not-registered",
                severity: "error",
                message:
                    'Class "NeedsMissingDependency" injects "MissingDependency" with mainz/di, ' +
                    "but that token is not registered in app startup services.",
                file: fixture.fixtureRoot.replaceAll("\\", "/") +
                    "/src/services/NeedsMissingDependency.ts",
                exportName: "NeedsMissingDependency",
            },
        ]);
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("cli/mainz: diagnose should accept named authorization policies declared in target config", async () => {
    const fixture = await createCliFixtureTargetConfig({
        fixtureName: "diagnostics-authorization-policies",
        targetName: "diagnostics-authorization-policies",
        locales: ["en"],
        authorizationPolicyNames: ["org-member"],
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
            "diagnose failed for diagnostics-authorization-policies fixture.",
        );

        assertEquals(JSON.parse(stdout), []);
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

        assertStringIncludes(stdout, "Diagnostics summary: 10 error(s), 6 warning(s)");
        assertStringIncludes(stdout, "Target: diagnostics-routes");
        assertStringIncludes(stdout, "error dynamic-ssg-missing-entries");
        assertStringIncludes(stdout, "error dynamic-ssg-invalid-entries");
        assertStringIncludes(stdout, "warning dynamic-ssg-missing-load");
        assertStringIncludes(stdout, "error page-static-load-unsupported");
        assertStringIncludes(stdout, "warning component-load-missing-fallback");
        assertStringIncludes(stdout, "warning component-render-strategy-without-load");
        assertStringIncludes(stdout, "route: /docs/:slug");
        assertStringIncludes(
            stdout,
            'SSG route "/docs/:slug" must define entries() to expand dynamic params.',
        );
    } finally {
        await fixture.cleanup();
    }
});
