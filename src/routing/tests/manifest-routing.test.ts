/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import { buildSsgOutputEntries, buildTargetRouteManifest, toLocalePathSegment } from "../index.ts";
import { TargetRouteManifest } from "../types.ts";

Deno.test("routing/manifest: should allow app-only targets with no routing input", () => {
    const manifest = buildTargetRouteManifest({
        target: {
            name: "playground",
            rootDir: "./playground",
        },
        globalLocales: ["en"],
    });

    assertEquals(manifest, {
        target: "playground",
        routes: [],
    });
});

Deno.test("routing/manifest: should resolve locales with precedence page > target > global", () => {
    const manifest = buildTargetRouteManifest({
        target: {
            name: "site",
            rootDir: "./site",
            pagesDir: "./site/pages",
            locales: ["pt-BR"],
        },
        discoveredPages: [
            {
                file: "./site/pages/from-page.page.tsx",
                exportName: "FromPage",
                path: "/from-page",
                mode: "ssg",
                locales: ["en-US"],
            },
            {
                file: "./site/pages/from-target.page.tsx",
                exportName: "FromTarget",
                path: "/from-target",
                mode: "csr",
            },
        ],
        globalLocales: ["en", "pt"],
    });

    const byPath = new Map(manifest.routes.map((route) => [route.path, route]));

    assertEquals(byPath.get("/from-page")?.locales, ["en-US"]);
    assertEquals(byPath.get("/from-target")?.locales, ["pt-BR"]);
});

Deno.test("routing/manifest: should fallback to global locales when page and target are undefined", () => {
    const manifest = buildTargetRouteManifest({
        target: {
            name: "playground",
            rootDir: "./playground",
            pagesDir: "./playground/pages",
        },
        discoveredPages: [
            {
                file: "./playground/pages/index.page.tsx",
                exportName: "HomePage",
                path: "/",
                mode: "csr",
            },
        ],
        globalLocales: ["en", "pt"],
    });

    assertEquals(manifest.routes[0].locales, ["en", "pt"]);
});

Deno.test("routing/manifest: should emit no locale prefix when route locale is inferred from a single global locale", () => {
    const manifest = buildTargetRouteManifest({
        target: {
            name: "playground",
            rootDir: "./playground",
            pagesDir: "./playground/pages",
        },
        discoveredPages: [
            {
                file: "./playground/pages/index.page.tsx",
                exportName: "HomePage",
                path: "/",
                mode: "ssg",
            },
        ],
        globalLocales: ["en"],
    });

    const outputs = buildSsgOutputEntries(manifest, "dist/playground");

    assertEquals(outputs, [
        {
            target: "playground",
            routeId: "index",
            locale: "en",
            outputHtmlPath: "dist/playground/index.html",
        },
    ]);
});

Deno.test("routing/manifest: should resolve locales from i18n config when provided", () => {
    const manifest = buildTargetRouteManifest({
        target: {
            name: "playground",
            rootDir: "./playground",
            pagesDir: "./playground/pages",
        },
        discoveredPages: [
            {
                file: "./playground/pages/index.page.tsx",
                exportName: "HomePage",
                path: "/",
                mode: "csr",
            },
        ],
        i18n: {
            locales: ["en-US", "pt-BR"],
        },
    });

    assertEquals(manifest.routes[0].locales, ["en-US", "pt-BR"]);
});

Deno.test("routing/manifest: should normalize legacy spa mode to csr for filesystem pages", () => {
    const manifest = buildTargetRouteManifest({
        target: {
            name: "playground",
            rootDir: "./playground",
            pagesDir: "./playground/pages",
            defaultMode: "spa",
        },
        filesystemPageFiles: [
            "./playground/pages/index.page.tsx",
        ],
        globalLocales: ["en"],
    });

    assertEquals(manifest.routes[0].mode, "csr");
});

Deno.test("routing/manifest: should fail when discovered pages conflict in the same locale scope", () => {
    assertThrows(() => {
        buildTargetRouteManifest({
            target: {
                name: "site",
                rootDir: "./site",
                pagesDir: "./site/pages",
            },
            discoveredPages: [
                { file: "./site/pages/blog-slug.page.tsx", exportName: "BlogSlugPage", path: "/blog/:slug", mode: "ssg" },
                { file: "./site/pages/blog-id.page.tsx", exportName: "BlogIdPage", path: "/blog/:id", mode: "csr" },
            ],
            globalLocales: ["en"],
        });
    }, Error, "conflicting routes");
});

Deno.test("routing/manifest: should require target defaultMode for filesystem routing", () => {
    assertThrows(() => {
        buildTargetRouteManifest({
            target: {
                name: "docs",
                rootDir: "./docs-site",
                pagesDir: "./docs-site/pages",
            },
            filesystemPageFiles: ["./docs-site/pages/index.page.tsx"],
            globalLocales: ["en"],
        });
    }, Error, "requires defaultMode");
});

Deno.test("routing/manifest: should build routes from discovered page metadata", () => {
    const manifest = buildTargetRouteManifest({
        target: {
            name: "site",
            rootDir: "./site",
            pagesDir: "./site/pages",
        },
        discoveredPages: [
            {
                file: "./site/pages/index.page.tsx",
                exportName: "HomePage",
                path: "/",
                mode: "csr",
                head: {
                    title: "Home",
                },
            },
            {
                file: "./site/pages/docs.page.tsx",
                exportName: "DocsPage",
                path: "/docs",
                mode: "ssg",
                locales: ["pt-BR"],
            },
        ],
        globalLocales: ["en"],
    });

    assertEquals(manifest.routes, [
        {
            id: "index",
            source: "filesystem",
            file: "./site/pages/index.page.tsx",
            exportName: "HomePage",
            path: "/",
            pattern: "/",
            mode: "csr",
            locales: ["en"],
            head: {
                title: "Home",
                meta: undefined,
                links: undefined,
            },
        },
        {
            id: "docs",
            source: "filesystem",
            file: "./site/pages/docs.page.tsx",
            exportName: "DocsPage",
            path: "/docs",
            pattern: "/docs",
            mode: "ssg",
            locales: ["pt-BR"],
            head: undefined,
        },
    ]);
});

Deno.test("routing/manifest: should map SSG outputs with locale prefix policy", () => {
    const manifest: TargetRouteManifest = {
        target: "site",
        routes: [
            {
                id: "docs-install",
                source: "filesystem",
                path: "/docs/install",
                pattern: "/docs/install",
                mode: "ssg",
                locales: ["en", "pt-BR"],
            },
            {
                id: "home",
                source: "filesystem",
                path: "/",
                pattern: "/",
                mode: "ssg",
                locales: ["en"],
            },
            {
                id: "app",
                source: "filesystem",
                path: "/app",
                pattern: "/app",
                mode: "csr",
                locales: ["en", "pt-BR"],
            },
        ],
    };

    const outputs = buildSsgOutputEntries(manifest, "dist/site/");
    assertEquals(outputs, [
        {
            target: "site",
            routeId: "docs-install",
            locale: "en",
            outputHtmlPath: "dist/site/en/docs/install/index.html",
        },
        {
            target: "site",
            routeId: "docs-install",
            locale: "pt-BR",
            outputHtmlPath: "dist/site/pt-br/docs/install/index.html",
        },
        {
            target: "site",
            routeId: "home",
            locale: "en",
            outputHtmlPath: "dist/site/index.html",
        },
    ]);
});

Deno.test("routing/manifest: should emit no locale prefix when a route resolves to a single locale", () => {
    const manifest: TargetRouteManifest = {
        target: "playground",
        routes: [
            {
                id: "docs",
                source: "filesystem",
                path: "/docs",
                pattern: "/docs",
                mode: "ssg",
                locales: ["en"],
            },
        ],
    };

    const outputs = buildSsgOutputEntries(manifest, "dist/playground");

    assertEquals(outputs, [
        {
            target: "playground",
            routeId: "docs",
            locale: "en",
            outputHtmlPath: "dist/playground/docs/index.html",
        },
    ]);
});

Deno.test("routing/manifest: should emit locale prefixes when a route resolves to multiple locales", () => {
    const manifest: TargetRouteManifest = {
        target: "playground",
        routes: [
            {
                id: "docs",
                source: "filesystem",
                path: "/docs",
                pattern: "/docs",
                mode: "ssg",
                locales: ["en", "pt-BR"],
            },
        ],
    };

    const outputs = buildSsgOutputEntries(manifest, "dist/playground");

    assertEquals(outputs, [
        {
            target: "playground",
            routeId: "docs",
            locale: "en",
            outputHtmlPath: "dist/playground/en/docs/index.html",
        },
        {
            target: "playground",
            routeId: "docs",
            locale: "pt-BR",
            outputHtmlPath: "dist/playground/pt-br/docs/index.html",
        },
    ]);
});

Deno.test("routing/manifest: should allow forcing locale prefixes even when a route has a single locale", () => {
    const manifest: TargetRouteManifest = {
        target: "playground",
        routes: [
            {
                id: "docs",
                source: "filesystem",
                path: "/docs",
                pattern: "/docs",
                mode: "ssg",
                locales: ["en"],
            },
        ],
    };

    const outputs = buildSsgOutputEntries(manifest, "dist/playground", {
        localePrefix: "always",
    });

    assertEquals(outputs, [
        {
            target: "playground",
            routeId: "docs",
            locale: "en",
            outputHtmlPath: "dist/playground/en/docs/index.html",
        },
    ]);
});

Deno.test("routing/manifest: locale path segment should be lowercase", () => {
    assertEquals(toLocalePathSegment("pt-BR"), "pt-br");
    assertEquals(toLocalePathSegment("EN-us"), "en-us");
});
