/// <reference lib="deno.ns" />

import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "node:path";
import { normalizeMainzConfig } from "../../config/index.ts";
import {
    invalidLocalePageDiscoveryErrorKind,
    pageDiscoveryFailedErrorKind,
} from "../page-discovery-errors.ts";
import {
    resolveTargetDiagnosticsEvaluationsForTarget,
    resolveTargetDiscoveredPages,
    resolveTargetDiscoveredPagesForTarget,
} from "../target-page-discovery.ts";
import { createFixtureTargetConfig } from "../../../tests/helpers/fixture-config.ts";
import { cliTestsRepoRoot } from "../../../tests/helpers/types.ts";

Deno.test("routing/target-page-discovery: should classify invalid locale discovery failures with a structured kind", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-invalid-locales",
        targetName: "diagnostics-invalid-locales",
        locales: ["en"],
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
        locales: ["en"],
        omitPagesDir: true,
    });

    try {
        const target = normalizeMainzConfig({
            targets: [{
                name: fixture.targetName,
                rootDir: fixture.fixtureRoot,
                viteConfig: resolve(fixture.fixtureRoot, "vite.config.ts"),
                appFile: resolve(fixture.fixtureRoot, "src", "main.tsx"),
                locales: ["en"],
                outDir: fixture.outputDir,
                defaultNavigation: "spa",
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
        locales: ["en"],
        omitPagesDir: true,
    });

    try {
        const target = normalizeMainzConfig({
            targets: [{
                name: fixture.targetName,
                rootDir: fixture.fixtureRoot,
                viteConfig: resolve(fixture.fixtureRoot, "vite.config.ts"),
                appFile: resolve(fixture.fixtureRoot, "src", "main.tsx"),
                locales: ["en"],
                outDir: fixture.outputDir,
                defaultNavigation: "spa",
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
        locales: ["en", "pt"],
        omitPagesDir: true,
    });

    try {
        const target = normalizeMainzConfig({
            targets: [{
                name: fixture.targetName,
                rootDir: fixture.fixtureRoot,
                viteConfig: resolve(fixture.fixtureRoot, "vite.config.ts"),
                appFile: resolve(fixture.fixtureRoot, "src", "main.tsx"),
                locales: ["en", "pt"],
                outDir: fixture.outputDir,
                defaultNavigation: "spa",
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
                declaredRoutePath: page.declaredRoutePath,
            })),
            [
                {
                    exportName: "FixtureBasePathHomePage",
                    path: "/",
                    notFound: undefined,
                    declaredRoutePath: "/",
                },
                {
                    exportName: "FixtureBasePathNotFoundPage",
                    path: "/404",
                    notFound: true,
                    declaredRoutePath: undefined,
                },
            ],
        );
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("routing/target-page-discovery: should collect all routed app candidates in lexicographic app id order", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-multi-app",
        targetName: "diagnostics-multi-app",
        locales: ["en"],
        omitPagesDir: true,
    });

    try {
        const target = normalizeMainzConfig({
            targets: [{
                name: fixture.targetName,
                rootDir: fixture.fixtureRoot,
                viteConfig: resolve(fixture.fixtureRoot, "vite.config.ts"),
                appFile: resolve(fixture.fixtureRoot, "src", "main.tsx"),
                locales: ["en"],
                outDir: fixture.outputDir,
                defaultNavigation: "spa",
            }],
        }).targets[0];

        const evaluations = await resolveTargetDiagnosticsEvaluationsForTarget(target);

        assertEquals(
            evaluations.map((evaluation) => ({
                appId: evaluation.appId,
                paths: evaluation.discoveredPages.map((page) => page.path),
            })),
            [
                {
                    appId: "alpha-app",
                    paths: ["/alpha"],
                },
                {
                    appId: "beta-app",
                    paths: ["/beta"],
                },
            ],
        );
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("routing/target-page-discovery: should collect root-only app candidates in lexicographic app id order", async () => {
    const fixture = await createFixtureTargetConfig({
        fixtureName: "diagnostics-multi-root-app",
        targetName: "diagnostics-multi-root-app",
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
                defaultNavigation: "spa",
            }],
        }).targets[0];

        const evaluations = await resolveTargetDiagnosticsEvaluationsForTarget(target);

        assertEquals(
            evaluations.map((evaluation) => ({
                appId: evaluation.appId,
                pages: evaluation.discoveredPages.length,
            })),
            [
                {
                    appId: "alpha-root-app",
                    pages: 0,
                },
                {
                    appId: "beta-root-app",
                    pages: 0,
                },
            ],
        );
    } finally {
        await fixture.cleanup();
    }
});

Deno.test("routing/target-page-discovery: should report an explicit discovery error when a discovered routed app is missing id", async () => {
    const tempRoot = await Deno.makeTempDir({
        dir: cliTestsRepoRoot,
        prefix: ".mainz-route-app-id-",
    });
    const srcDir = resolve(tempRoot, "src");
    const pagesDir = resolve(srcDir, "pages");

    try {
        await Deno.mkdir(pagesDir, { recursive: true });
        await Deno.writeTextFile(
            resolve(srcDir, "main.tsx"),
            [
                'import { defineApp, startApp } from "../../../src/index.ts";',
                'import { MissingIdPage } from "./pages/MissingId.page.tsx";',
                "",
                "const app = defineApp({",
                "  // @ts-ignore test fixture intentionally omits id",
                "  pages: [MissingIdPage],",
                "});",
                "",
                "startApp(app, { mount: '#app' });",
                "",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            resolve(pagesDir, "MissingId.page.tsx"),
            [
                'import { Page, Route } from "../../../../src/index.ts";',
                "",
                '@Route("/")',
                "export class MissingIdPage extends Page {",
                "  override render() {",
                "    return <div>Missing id</div>;",
                "  }",
                "}",
                "",
            ].join("\n"),
        );

        const target = normalizeMainzConfig({
            targets: [{
                name: "missing-id-app",
                rootDir: tempRoot,
                viteConfig: resolve(tempRoot, "vite.config.ts"),
                appFile: resolve(srcDir, "main.tsx"),
                outDir: resolve(tempRoot, "dist"),
                defaultNavigation: "spa",
            }],
        }).targets[0];

        const evaluations = await resolveTargetDiagnosticsEvaluationsForTarget(target);

        assertEquals(evaluations.length, 1);
        assertEquals(evaluations[0]?.appId, undefined);
        assertStringIncludes(
            evaluations[0]?.discoveryErrors?.[0]?.message ?? "",
            "must declare a unique string id",
        );
    } finally {
        await Deno.remove(tempRoot, { recursive: true }).catch(() => undefined);
    }
});
