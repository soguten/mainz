/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import { buildSsgOutputEntries, buildTargetRouteManifest, toLocalePathSegment } from "../index.ts";
import { TargetRouteManifest } from "../types.ts";

Deno.test("routing/manifest: should require opt-in when routes and pagesDir coexist", () => {
    assertThrows(() => {
        buildTargetRouteManifest({
            target: {
                name: "site",
                rootDir: "./site",
                routes: "./site/routes.ts",
                pagesDir: "./site/pages",
                defaultMode: "ssg",
            },
            explicitRoutes: [],
            filesystemPageFiles: [],
            globalLocales: ["en"],
        });
    }, Error, "allowRoutingConflict=true");
});

Deno.test("routing/manifest: should resolve locales with precedence route > target > global", () => {
    const manifest = buildTargetRouteManifest({
        target: {
            name: "site",
            rootDir: "./site",
            routes: "./site/routes.ts",
            locales: ["pt-BR"],
        },
        explicitRoutes: [
            {
                path: "/from-route",
                mode: "ssg",
                locales: ["en-US"],
            },
            {
                path: "/from-target",
                mode: "csr",
            },
        ],
        globalLocales: ["en", "pt"],
    });

    const byPath = new Map(manifest.routes.map((route) => [route.path, route]));

    assertEquals(byPath.get("/from-route")?.locales, ["en-US"]);
    assertEquals(byPath.get("/from-target")?.locales, ["pt-BR"]);
});

Deno.test("routing/manifest: should fallback to global locales when route and target are undefined", () => {
    const manifest = buildTargetRouteManifest({
        target: {
            name: "playground",
            rootDir: "./playground",
            routes: "./playground/routes.ts",
        },
        explicitRoutes: [
            {
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
            routes: "./playground/routes.ts",
        },
        explicitRoutes: [
            {
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
            routes: "./playground/routes.ts",
        },
        explicitRoutes: [
            {
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

Deno.test("routing/manifest: should normalize legacy spa mode to csr", () => {
    const manifest = buildTargetRouteManifest({
        target: {
            name: "playground",
            rootDir: "./playground",
            routes: "./playground/routes.ts",
        },
        explicitRoutes: [
            {
                path: "/legacy",
                mode: "spa",
            },
        ],
        globalLocales: ["en"],
    });

    assertEquals(manifest.routes[0].mode, "csr");
});

Deno.test("routing/manifest: should let explicit routes win collisions when opt-in is enabled", () => {
    const manifest = buildTargetRouteManifest({
        target: {
            name: "site",
            rootDir: "./site",
            routes: "./site/routes.ts",
            pagesDir: "./site/pages",
            allowRoutingConflict: true,
            defaultMode: "ssg",
        },
        explicitRoutes: [
            {
                path: "/docs/:slug",
                mode: "ssg",
                locales: ["en"],
                file: "./site/routes.ts",
            },
        ],
        filesystemPageFiles: [
            "./site/pages/docs/[id].page.tsx",
            "./site/pages/docs/intro.page.tsx",
        ],
        globalLocales: ["en", "pt"],
    });

    const docsDynamicExplicit = manifest.routes.find((route) => {
        return route.path === "/docs/:slug" && route.source === "explicit";
    });

    const docsDynamicFilesystem = manifest.routes.find((route) => {
        return route.path === "/docs/:id" && route.source === "filesystem";
    });

    const docsIntro = manifest.routes.find((route) => {
        return route.path === "/docs/intro" && route.source === "filesystem";
    });

    assertEquals(docsDynamicExplicit?.locales, ["en"]);
    assertEquals(docsDynamicFilesystem?.locales, ["pt"]);
    assertEquals(docsIntro?.locales, ["en", "pt"]);
});

Deno.test("routing/manifest: should fail when explicit routes conflict in the same target+locale scope", () => {
    assertThrows(() => {
        buildTargetRouteManifest({
            target: {
                name: "site",
                rootDir: "./site",
                routes: "./site/routes.ts",
            },
            explicitRoutes: [
                { path: "/blog/:slug", mode: "ssg" },
                { path: "/blog/:id", mode: "csr" },
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
                source: "explicit",
                path: "/",
                pattern: "/",
                mode: "ssg",
                locales: ["en"],
            },
            {
                id: "app",
                source: "explicit",
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
                source: "explicit",
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
                source: "explicit",
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
                source: "explicit",
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
