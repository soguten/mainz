/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { loadMainzConfig, normalizeMainzConfig } from "../../config/index.ts";
import {
    collectDiagnosticsForConfig,
    formatDiagnosticsHuman,
    shouldFailDiagnostics,
} from "../index.ts";
import { createFixtureTargetConfig } from "../../../tests/helpers/fixture-config.ts";

Deno.test("diagnostics/command: should collect route diagnostics for a fixture target", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-routes",
        targetName: "diagnostics-routes",
        locales: ["en"],
    });

    try {
        const diagnostics = await collectFixtureDiagnostics(fixture.configPath, fixture.targetName);

        assertEquals(
            diagnostics.some((diagnostic) => diagnostic.code === "dynamic-ssg-missing-entries"),
            true,
        );
        assertEquals(
            diagnostics.some((diagnostic) => diagnostic.code === "dynamic-ssg-invalid-entries"),
            true,
        );
        assertEquals(
            diagnostics.some((diagnostic) => diagnostic.code === "page-static-load-unsupported"),
            true,
        );
        assertEquals(
            diagnostics.some((diagnostic) => diagnostic.code === "component-load-missing-fallback"),
            true,
        );
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("diagnostics/command: should report invalid locale tags declared in @Locales(...)", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-invalid-locales",
        targetName: "diagnostics-invalid-locales",
        locales: ["en"],
    });

    try {
        const diagnostics = await collectFixtureDiagnostics(fixture.configPath, fixture.targetName);

        assertEquals(diagnostics.length, 1);
        assertEquals(diagnostics[0]?.code, "invalid-locale-tag");
        assertStringIncludes(diagnostics[0]?.message ?? "", 'Invalid locale "en--US"');
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("diagnostics/command: should report authorization and DI diagnostics from fixture targets", async () => {
    const authorizationFixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-authorization-policies",
        targetName: "diagnostics-authorization-policies",
        locales: ["en"],
    });
    const diFixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-di",
        targetName: "diagnostics-di",
        locales: ["en"],
    });

    try {
        const authorizationDiagnostics = await collectFixtureDiagnostics(
            authorizationFixture.configPath,
            authorizationFixture.targetName,
        );
        const diDiagnostics = await collectFixtureDiagnostics(diFixture.configPath, diFixture.targetName);

        assertEquals(
            authorizationDiagnostics.some((diagnostic) =>
                diagnostic.code === "authorization-policy-not-registered"
            ),
            true,
        );
        assertEquals(diDiagnostics.some((diagnostic) => diagnostic.code === "di-token-not-registered"), true);
        assertEquals(
            diDiagnostics.some((diagnostic) => diagnostic.code === "di-registration-cycle"),
            true,
        );
    } finally {
        await authorizationFixture.cleanup();
        await diFixture.cleanup();
    }
});

Deno.test("diagnostics/command: should accept named authorization policies declared in target config", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-authorization-policies",
        targetName: "diagnostics-authorization-policies",
        locales: ["en"],
        authorizationPolicyNames: ["org-member"],
    });

    try {
        const diagnostics = await collectFixtureDiagnostics(fixture.configPath, fixture.targetName);
        assertEquals(diagnostics, []);
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("diagnostics/command: should support failure policies and human formatting", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-routes",
        targetName: "diagnostics-routes",
        locales: ["en"],
    });

    try {
        const diagnostics = await collectFixtureDiagnostics(fixture.configPath, fixture.targetName);
        const output = formatDiagnosticsHuman(diagnostics);

        assertEquals(shouldFailDiagnostics(diagnostics, "never"), false);
        assertEquals(shouldFailDiagnostics(diagnostics, "error"), true);
        assertEquals(shouldFailDiagnostics(diagnostics, "warning"), true);
        assertStringIncludes(output, "Diagnostics summary:");
        assertStringIncludes(output, "Target: diagnostics-routes");
        assertStringIncludes(output, "error dynamic-ssg-missing-entries");
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("diagnostics/command: should evaluate multi-app targets by app id and allow explicit --app selection", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-multi-app",
        targetName: "diagnostics-multi-app",
        locales: ["en"],
        omitPagesDir: true,
    });

    try {
        const loadedConfig = await loadMainzConfig(fixture.configPath);
        const normalizedConfig = normalizeMainzConfig(loadedConfig.config);

        const diagnostics = await collectDiagnosticsForConfig(normalizedConfig, {
            target: fixture.targetName,
        }, Deno.cwd());
        const betaDiagnostics = await collectDiagnosticsForConfig(normalizedConfig, {
            target: fixture.targetName,
            app: "beta-app",
        }, Deno.cwd());
        const alphaDiagnostics = await collectDiagnosticsForConfig(normalizedConfig, {
            target: fixture.targetName,
            app: "alpha-app",
        }, Deno.cwd());

        assertEquals(diagnostics.some((diagnostic) => diagnostic.appId === "alpha-app"), true);
        assertEquals(
            diagnostics.some((diagnostic) => diagnostic.code === "di-token-not-registered"),
            true,
        );
        assertEquals(betaDiagnostics, []);
        assertEquals(
            alphaDiagnostics.some((diagnostic) =>
                diagnostic.appId === "alpha-app" && diagnostic.code === "di-token-not-registered"
            ),
            true,
        );
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("diagnostics/command: should evaluate multi-root-app targets by app id and allow explicit --app selection", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-multi-root-app",
        targetName: "diagnostics-multi-root-app",
        omitPagesDir: true,
    });

    try {
        const loadedConfig = await loadMainzConfig(fixture.configPath);
        const normalizedConfig = normalizeMainzConfig(loadedConfig.config);

        const diagnostics = await collectDiagnosticsForConfig(normalizedConfig, {
            target: fixture.targetName,
        }, Deno.cwd());
        const betaDiagnostics = await collectDiagnosticsForConfig(normalizedConfig, {
            target: fixture.targetName,
            app: "beta-root-app",
        }, Deno.cwd());
        const alphaDiagnostics = await collectDiagnosticsForConfig(normalizedConfig, {
            target: fixture.targetName,
            app: "alpha-root-app",
        }, Deno.cwd());

        assertEquals(diagnostics.some((diagnostic) => diagnostic.appId === "alpha-root-app"), true);
        assertEquals(
            diagnostics.some((diagnostic) =>
                diagnostic.appId === "alpha-root-app" && diagnostic.code === "di-token-not-registered"
            ),
            true,
        );
        assertEquals(betaDiagnostics, []);
        assertEquals(
            alphaDiagnostics.some((diagnostic) =>
                diagnostic.appId === "alpha-root-app" && diagnostic.code === "di-token-not-registered"
            ),
            true,
        );
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("diagnostics/command: human formatting should print subject when present", () => {
    const output = formatDiagnosticsHuman([
        {
            target: "docs",
            code: "invalid-locale-tag",
            severity: "error",
            message: 'Page "DocsPage" declares invalid locale "pt_BR".',
            file: "C:/repo/docs-site/src/pages/Docs.page.tsx",
            exportName: "DocsPage",
            routePath: "/docs",
            subject: "locale=pt_BR",
        },
    ]);

    assertStringIncludes(output, "error invalid-locale-tag");
    assertStringIncludes(output, "subject: locale=pt_BR");
    assertStringIncludes(output, "route: /docs");
});

Deno.test("diagnostics/command: human formatting should group diagnostics by app when app id is present", () => {
    const output = formatDiagnosticsHuman([
        {
            target: "docs",
            appId: "site",
            code: "invalid-locale-tag",
            severity: "error",
            message: 'Page "DocsPage" declares invalid locale "pt_BR".',
            file: "C:/repo/docs-site/src/pages/Docs.page.tsx",
            exportName: "DocsPage",
            routePath: "/docs",
        },
    ]);

    assertStringIncludes(output, "Target: docs");
    assertStringIncludes(output, "App: site");
    assertStringIncludes(output, "error invalid-locale-tag");
});

async function collectFixtureDiagnostics(configPath: string, target: string) {
    const loadedConfig = await loadMainzConfig(configPath);
    const normalizedConfig = normalizeMainzConfig(loadedConfig.config);
    return await collectDiagnosticsForConfig(normalizedConfig, { target }, Deno.cwd());
}
