/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import {
    buildSsgOutputEntries,
    buildTargetRouteManifest,
    isDynamicRoutePath,
    materializeRoutePath,
    toLocalePathSegment,
    validateRouteEntryParams,
} from "../index.ts";
import { TargetRouteManifest } from "../types.ts";

Deno.test("routing/manifest: should allow app-only targets with no routing input", () => {
    const manifest = buildTargetRouteManifest({
        target: {
            name: "playground",
            rootDir: "./playground",
        },
    });

    assertEquals(manifest, {
        target: "playground",
        routes: [],
    });
});

Deno.test("routing/manifest: should resolve locales with precedence page > target", () => {
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
    });

    const byPath = new Map(manifest.routes.map((route) => [route.path, route]));

    assertEquals(byPath.get("/from-page")?.locales, ["en-US"]);
    assertEquals(byPath.get("/from-target")?.locales, ["pt-BR"]);
});

Deno.test("routing/manifest: should emit no locale prefix when route locale is inferred from a single target locale", () => {
    const manifest = buildTargetRouteManifest({
        target: {
            name: "playground",
            rootDir: "./playground",
            pagesDir: "./playground/pages",
            locales: ["en"],
        },
        discoveredPages: [
            {
                file: "./playground/pages/index.page.tsx",
                exportName: "HomePage",
                path: "/",
                mode: "ssg",
            },
        ],
    });

    const outputs = buildSsgOutputEntries(manifest, "dist/playground");

    assertEquals(outputs, [
        {
            target: "playground",
            routeId: "index",
            locale: "en",
            outputHtmlPath: "dist/playground/index.html",
            renderPath: "/",
            notFound: undefined,
        },
    ]);
});

Deno.test("routing/manifest: should use explicit csr defaultMode for filesystem pages", () => {
    const manifest = buildTargetRouteManifest({
        target: {
            name: "playground",
            rootDir: "./playground",
            pagesDir: "./playground/pages",
            defaultMode: "csr",
            locales: ["en"],
        },
        filesystemPageFiles: [
            "./playground/pages/index.page.tsx",
        ],
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
                locales: ["en"],
            },
            discoveredPages: [
                { file: "./site/pages/blog-slug.page.tsx", exportName: "BlogSlugPage", path: "/blog/:slug", mode: "ssg" },
                { file: "./site/pages/blog-id.page.tsx", exportName: "BlogIdPage", path: "/blog/:id", mode: "csr" },
            ],
        });
    }, Error, "conflicting routes");
});

Deno.test("routing/manifest: should reject multiple notFound pages", () => {
    assertThrows(() => {
        buildTargetRouteManifest({
            target: {
                name: "site",
                rootDir: "./site",
                pagesDir: "./site/pages",
                locales: ["en"],
            },
            discoveredPages: [
                { file: "./site/pages/not-found-a.page.tsx", exportName: "NotFoundA", path: "/404-a", mode: "ssg", notFound: true },
                { file: "./site/pages/not-found-b.page.tsx", exportName: "NotFoundB", path: "/404-b", mode: "ssg", notFound: true },
            ],
        });
    }, Error, "multiple notFound routes");
});

Deno.test("routing/manifest: should require notFound pages to use ssg mode", () => {
    assertThrows(() => {
        buildTargetRouteManifest({
            target: {
                name: "site",
                rootDir: "./site",
                pagesDir: "./site/pages",
                locales: ["en"],
            },
            discoveredPages: [
                { file: "./site/pages/not-found.page.tsx", exportName: "NotFoundPage", path: "/404", mode: "csr", notFound: true },
            ],
        });
    }, Error, 'must use mode "ssg"');
});

Deno.test("routing/manifest: should require target defaultMode for filesystem routing", () => {
    assertThrows(() => {
        buildTargetRouteManifest({
            target: {
                name: "docs",
                rootDir: "./docs-site",
                pagesDir: "./docs-site/pages",
                locales: ["en"],
            },
            filesystemPageFiles: ["./docs-site/pages/index.page.tsx"],
        });
    }, Error, "requires defaultMode");
});

Deno.test("routing/manifest: should build routes from discovered page metadata", () => {
    const manifest = buildTargetRouteManifest({
        target: {
            name: "site",
            rootDir: "./site",
            pagesDir: "./site/pages",
            locales: ["en"],
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
                authorization: {
                    requirement: {
                        authenticated: true,
                        roles: ["member"],
                    },
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
            notFound: undefined,
            locales: ["en"],
            head: {
                title: "Home",
                meta: undefined,
                links: undefined,
            },
            authorization: {
                allowAnonymous: undefined,
                requirement: {
                    authenticated: true,
                    roles: ["member"],
                    policy: undefined,
                },
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
            notFound: undefined,
            locales: ["pt-BR"],
            head: undefined,
            authorization: undefined,
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
            renderPath: "/en/docs/install",
            notFound: undefined,
        },
        {
            target: "site",
            routeId: "docs-install",
            locale: "pt-BR",
            outputHtmlPath: "dist/site/pt-br/docs/install/index.html",
            renderPath: "/pt-br/docs/install",
            notFound: undefined,
        },
        {
            target: "site",
            routeId: "home",
            locale: "en",
            outputHtmlPath: "dist/site/index.html",
            renderPath: "/",
            notFound: undefined,
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
            renderPath: "/docs",
            notFound: undefined,
        },
    ]);
});

Deno.test("routing/manifest: should identify dynamic route patterns and materialize concrete paths", () => {
    assertEquals(isDynamicRoutePath("/docs/:slug"), true);
    assertEquals(isDynamicRoutePath("/docs/[...parts]"), true);
    assertEquals(isDynamicRoutePath("/docs/install"), false);

    assertEquals(materializeRoutePath("/docs/:slug", { slug: "intro guide" }), "/docs/intro%20guide");
    assertEquals(materializeRoutePath("/docs/[...parts]", { parts: "guides/getting-started" }), "/docs/guides/getting-started");
});

Deno.test("routing/manifest: should validate required params for dynamic route entries", () => {
    validateRouteEntryParams("/docs/:slug", { slug: "intro" });
    validateRouteEntryParams("/docs/[...parts]", { parts: "guides/getting-started" });

    assertThrows(() => {
        validateRouteEntryParams("/docs/:slug", {});
    }, Error, 'requires "slug"');

    assertThrows(() => {
        validateRouteEntryParams("/docs/[...parts]", {});
    }, Error, 'requires "parts"');
});

Deno.test("routing/manifest: should require entries for dynamic ssg outputs", () => {
    const manifest: TargetRouteManifest = {
        target: "site",
        routes: [
            {
                id: "docs-slug",
                source: "filesystem",
                path: "/docs/:slug",
                pattern: "/docs/:slug",
                mode: "ssg",
                locales: ["en", "pt"],
            },
        ],
    };

    assertThrows(() => {
        buildSsgOutputEntries(manifest, "dist/site");
    }, Error, "requires entries()");
});

Deno.test("routing/manifest: should expand dynamic ssg outputs from resolved entries", () => {
    const manifest: TargetRouteManifest = {
        target: "site",
        routes: [
            {
                id: "docs-slug",
                source: "filesystem",
                path: "/docs/:slug",
                pattern: "/docs/:slug",
                mode: "ssg",
                locales: ["en", "pt"],
            },
        ],
    };

    const outputs = buildSsgOutputEntries(manifest, "dist/site", {
        routeEntriesByRouteId: new Map([
            [
                "docs-slug",
                [
                    { locale: "en", params: { slug: "intro" } },
                    { locale: "pt", params: { slug: "guia-inicial" } },
                ],
            ],
        ]),
    });

    assertEquals(outputs, [
        {
            target: "site",
            routeId: "docs-slug",
            locale: "en",
            outputHtmlPath: "dist/site/en/docs/intro/index.html",
            renderPath: "/en/docs/intro",
            params: { slug: "intro" },
            notFound: undefined,
        },
        {
            target: "site",
            routeId: "docs-slug",
            locale: "pt",
            outputHtmlPath: "dist/site/pt/docs/guia-inicial/index.html",
            renderPath: "/pt/docs/guia-inicial",
            params: { slug: "guia-inicial" },
            notFound: undefined,
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
            renderPath: "/en/docs",
            notFound: undefined,
        },
        {
            target: "playground",
            routeId: "docs",
            locale: "pt-BR",
            outputHtmlPath: "dist/playground/pt-br/docs/index.html",
            renderPath: "/pt-br/docs",
            notFound: undefined,
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
            renderPath: "/en/docs",
            notFound: undefined,
        },
    ]);
});

Deno.test("routing/manifest: should emit a root 404.html for notFound routes", () => {
    const manifest: TargetRouteManifest = {
        target: "site",
        routes: [
            {
                id: "not-found",
                source: "filesystem",
                path: "/404",
                pattern: "/404",
                mode: "ssg",
                notFound: true,
                locales: ["en", "pt-BR"],
            },
        ],
    };

    const outputs = buildSsgOutputEntries(manifest, "dist/site", {
        defaultLocale: "pt-BR",
    });

    assertEquals(outputs, [
        {
            target: "site",
            routeId: "not-found",
            locale: "en",
            outputHtmlPath: "dist/site/en/404/index.html",
            renderPath: "/en/404",
            notFound: true,
        },
        {
            target: "site",
            routeId: "not-found",
            locale: "pt-BR",
            outputHtmlPath: "dist/site/pt-br/404/index.html",
            renderPath: "/pt-br/404",
            notFound: true,
        },
        {
            target: "site",
            routeId: "not-found",
            locale: "pt-BR",
            outputHtmlPath: "dist/site/404.html",
            renderPath: "/pt-br/404",
            notFound: true,
        },
    ]);
});

Deno.test("routing/manifest: locale path segment should be lowercase", () => {
    assertEquals(toLocalePathSegment("pt-BR"), "pt-br");
    assertEquals(toLocalePathSegment("EN-us"), "en-us");
});

