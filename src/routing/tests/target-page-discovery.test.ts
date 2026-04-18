/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { normalizeMainzConfig } from "../../config/index.ts";
import {
    invalidLocalePageDiscoveryErrorKind,
    pageDiscoveryFailedErrorKind,
} from "../page-discovery-errors.ts";
import {
    resolveTargetDiscoveredPages,
    resolveTargetDiscoveredPagesForTarget,
} from "../target-page-discovery.ts";
import { createFixtureTargetConfig } from "../../../tests/helpers/fixture-config.ts";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test("routing/target-page-discovery: should classify invalid locale discovery failures with a structured kind", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-invalid-locales",
        targetName: "diagnostics-invalid-locales",
    });

    try {
        const { discoveryErrors } = await resolveTargetDiscoveredPages(
            resolve(fixture.fixtureRoot, "src", "pages"),
        );

        assertEquals(discoveryErrors?.length, 1);
        assertEquals(discoveryErrors?.[0]?.kind, invalidLocalePageDiscoveryErrorKind);
        assertStringIncludes(
            discoveryErrors?.[0]?.message ?? "",
            '@Locales() received invalid locale "en--US"',
        );
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("routing/target-page-discovery: should classify generic page discovery failures with a structured kind", async () => {
    const tempRoot = await Deno.makeTempDir({
        dir: cliTestsRepoRoot,
        prefix: ".mainz-route-pages-",
    });
    const pagesDir = resolve(tempRoot, "src", "pages");
    const pageFile = resolve(pagesDir, "Broken.page.tsx");

    try {
        await Deno.mkdir(pagesDir, { recursive: true });
        await Deno.writeTextFile(
            pageFile,
            [
                'import { Page } from "../../../src/components/page.ts";',
                "",
                "export class BrokenPage extends Page {}",
                "",
            ].join("\n"),
        );

        const { discoveryErrors } = await resolveTargetDiscoveredPages(pagesDir);

        assertEquals(discoveryErrors?.length, 1);
        assertEquals(discoveryErrors?.[0]?.kind, pageDiscoveryFailedErrorKind);
        assertStringIncludes(
            discoveryErrors?.[0]?.message ?? "",
            "must define a route with @Route(...)",
        );
    } finally {
        await Deno.remove(tempRoot, { recursive: true }).catch(() => undefined);
    }
});

Deno.test("routing/target-page-discovery: should discover routed pages from the conventional app module when pagesDir is omitted", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-di",
        targetName: "diagnostics-di-app-file",
        omitPagesDir: true,
    });

    try {
        const target = normalizeMainzConfig({
            targets: [{
                name: fixture.targetName,
                rootDir: fixture.fixtureRoot,
                viteConfig: resolve(fixture.fixtureRoot, "vite.config.ts"),
                appFile: resolve(fixture.fixtureRoot, "src", "main.tsx"),
                outDir: fixture.outputDir,
            }],
        }).targets[0];

        const { discoveredPages, discoveryErrors } = await resolveTargetDiscoveredPagesForTarget(
            target,
        );

        assertEquals(discoveryErrors, undefined);
        assertEquals(
            discoveredPages?.map((page) => ({
                file: page.file,
                exportName: page.exportName,
                path: page.path,
            })),
            [{
                file: resolve(fixture.fixtureRoot, "src", "pages", "Home.page.tsx").replaceAll(
                    "\\",
                    "/",
                ),
                exportName: "DiagnosticsDiFixturePage",
                path: "/",
            }],
        );
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("routing/target-page-discovery: should discover routed pages when main.tsx imports a default-exported app definition", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-di-imported-app",
        targetName: "diagnostics-di-imported-app",
        omitPagesDir: true,
    });

    try {
        const target = normalizeMainzConfig({
            targets: [{
                name: fixture.targetName,
                rootDir: fixture.fixtureRoot,
                viteConfig: resolve(fixture.fixtureRoot, "vite.config.ts"),
                appFile: resolve(fixture.fixtureRoot, "src", "main.tsx"),
                outDir: fixture.outputDir,
            }],
        }).targets[0];

        const { discoveredPages, discoveryErrors } = await resolveTargetDiscoveredPagesForTarget(
            target,
        );

        assertEquals(discoveryErrors, undefined);
        assertEquals(
            discoveredPages?.map((page) => ({
                file: page.file,
                exportName: page.exportName,
                path: page.path,
            })),
            [{
                file: resolve(
                    fixture.fixtureRoot,
                    "src",
                    "pages",
                    "Home.page.tsx",
                ).replaceAll("\\", "/"),
                exportName: "DiagnosticsImportedAppPage",
                path: "/",
            }],
        );
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("routing/target-page-discovery: should discover app-level notFound pages without requiring @Route(...)", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "base-path",
        targetName: "base-path-app-file",
        omitPagesDir: true,
    });

    try {
        const target = normalizeMainzConfig({
            targets: [{
                name: fixture.targetName,
                rootDir: fixture.fixtureRoot,
                viteConfig: resolve(fixture.fixtureRoot, "vite.config.ts"),
                appFile: resolve(fixture.fixtureRoot, "src", "main.tsx"),
                outDir: fixture.outputDir,
            }],
        }).targets[0];

        const { discoveredPages, discoveryErrors } = await resolveTargetDiscoveredPagesForTarget(
            target,
        );

        assertEquals(discoveryErrors, undefined);
        assertEquals(
            discoveredPages?.map((page) => ({
                exportName: page.exportName,
                path: page.path,
                notFound: page.notFound,
            })),
            [
                {
                    exportName: "FixtureBasePathHomePage",
                    path: "/",
                    notFound: undefined,
                },
                {
                    exportName: "FixtureBasePathNotFoundPage",
                    path: "/404",
                    notFound: true,
                },
            ],
        );
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("routing/target-page-discovery: should select the configured appId when resolving discovered pages for a target", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-multi-app",
        targetName: "diagnostics-multi-app-selected",
        omitPagesDir: true,
    });

    try {
        const target = normalizeMainzConfig({
            targets: [{
                name: fixture.targetName,
                rootDir: fixture.fixtureRoot,
                viteConfig: resolve(fixture.fixtureRoot, "vite.config.ts"),
                appFile: resolve(fixture.fixtureRoot, "src", "main.tsx"),
                appId: "beta-app",
                outDir: fixture.outputDir,
            }],
        }).targets[0];

        const { discoveredPages, discoveryErrors } = await resolveTargetDiscoveredPagesForTarget(
            target,
        );

        assertEquals(discoveryErrors, undefined);
        assertEquals(
            discoveredPages?.map((page) => ({
                exportName: page.exportName,
                path: page.path,
            })),
            [{
                exportName: "BetaPage",
                path: "/beta",
            }],
        );
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("routing/target-page-discovery: should require appId when app discovery finds multiple routed apps", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-multi-app",
        targetName: "diagnostics-multi-app-ambiguous",
        omitPagesDir: true,
    });

    try {
        const target = normalizeMainzConfig({
            targets: [{
                name: fixture.targetName,
                rootDir: fixture.fixtureRoot,
                viteConfig: resolve(fixture.fixtureRoot, "vite.config.ts"),
                appFile: resolve(fixture.fixtureRoot, "src", "main.tsx"),
                outDir: fixture.outputDir,
            }],
        }).targets[0];

        const { discoveryErrors } = await resolveTargetDiscoveredPagesForTarget(target);

        assertStringIncludes(
            discoveryErrors?.[0]?.message ?? "",
            "found multiple routed apps",
        );
        assertStringIncludes(
            discoveryErrors?.[0]?.message ?? "",
            "Add appId to select one",
        );
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("routing/target-page-discovery: should report an explicit error when target appId matches no discovered app", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-multi-app",
        targetName: "diagnostics-multi-app-missing-selection",
        omitPagesDir: true,
    });

    try {
        const target = normalizeMainzConfig({
            targets: [{
                name: fixture.targetName,
                rootDir: fixture.fixtureRoot,
                viteConfig: resolve(fixture.fixtureRoot, "vite.config.ts"),
                appFile: resolve(fixture.fixtureRoot, "src", "main.tsx"),
                appId: "missing-app",
                outDir: fixture.outputDir,
            }],
        }).targets[0];

        const { discoveryErrors } = await resolveTargetDiscoveredPagesForTarget(target);

        assertStringIncludes(
            discoveryErrors?.[0]?.message ?? "",
            'selects appId "missing-app", but',
        );
    } finally {
        await fixture.cleanup();
    }
});
