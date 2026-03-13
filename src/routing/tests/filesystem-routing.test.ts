/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import {
    inferFilesystemRoute,
    inferFilesystemRoutes,
    isFilesystemPageFile,
} from "../index.ts";

Deno.test("routing/filesystem: should identify supported page files", () => {
    assertEquals(isFilesystemPageFile("site/pages/index.page.tsx"), true);
    assertEquals(isFilesystemPageFile("site/pages/about.ssg.page.tsx"), true);
    assertEquals(isFilesystemPageFile("site/pages/about.csr.page.tsx"), true);
    assertEquals(isFilesystemPageFile("site/pages/about.spa.page.tsx"), true);
    assertEquals(isFilesystemPageFile("site/pages/about.tsx"), false);
});

Deno.test("routing/filesystem: should infer root and nested static paths", () => {
    const root = inferFilesystemRoute("C:\\repo\\site\\pages\\index.page.tsx", {
        pagesDir: "C:\\repo\\site\\pages",
        defaultMode: "ssg",
    });

    const nested = inferFilesystemRoute("C:\\repo\\site\\pages\\docs\\install.ssg.page.tsx", {
        pagesDir: "C:\\repo\\site\\pages",
        defaultMode: "csr",
    });

    assertEquals(root, {
        file: "C:/repo/site/pages/index.page.tsx",
        source: "filesystem",
        mode: "ssg",
        path: "/",
        pattern: "/",
        routeKey: "/",
    });

    assertEquals(nested, {
        file: "C:/repo/site/pages/docs/install.ssg.page.tsx",
        source: "filesystem",
        mode: "ssg",
        path: "/docs/install",
        pattern: "/docs/install",
        routeKey: "/docs/install",
    });
});

Deno.test("routing/filesystem: should infer dynamic and catch-all segments", () => {
    const dynamicRoute = inferFilesystemRoute("site/pages/blog/[slug].page.tsx", {
        pagesDir: "site/pages",
        defaultMode: "csr",
    });

    const catchAllRoute = inferFilesystemRoute("site/pages/blog/[...parts].csr.page.tsx", {
        pagesDir: "site/pages",
        defaultMode: "ssg",
    });

    const legacySpaSuffixRoute = inferFilesystemRoute("site/pages/blog/[...legacy].spa.page.tsx", {
        pagesDir: "site/pages",
        defaultMode: "ssg",
    });

    assertEquals(dynamicRoute?.path, "/blog/:slug");
    assertEquals(dynamicRoute?.routeKey, "/blog/:");
    assertEquals(dynamicRoute?.mode, "csr");

    assertEquals(catchAllRoute?.path, "/blog/*");
    assertEquals(catchAllRoute?.routeKey, "/blog/*");
    assertEquals(catchAllRoute?.mode, "csr");

    assertEquals(legacySpaSuffixRoute?.mode, "csr");
});

Deno.test("routing/filesystem: should throw for invalid catch-all placement", () => {
    assertThrows(() => {
        inferFilesystemRoute("site/pages/docs/[...parts]/edit.page.tsx", {
            pagesDir: "site/pages",
            defaultMode: "ssg",
        });
    }, Error, "catch-all segment must be in the final path segment");
});

Deno.test("routing/filesystem: should throw for duplicate param names in one route", () => {
    assertThrows(() => {
        inferFilesystemRoute("site/pages/blog/[slug]/[slug].page.tsx", {
            pagesDir: "site/pages",
            defaultMode: "ssg",
        });
    }, Error, "duplicate param name \"slug\"");
});

Deno.test("routing/filesystem: should detect canonical route conflicts", () => {
    assertThrows(() => {
        inferFilesystemRoutes(
            [
                "site/pages/blog/[slug].page.tsx",
                "site/pages/blog/[id].page.tsx",
            ],
            {
                pagesDir: "site/pages",
                defaultMode: "ssg",
            },
        );
    }, Error, "Filesystem routing conflict");
});

Deno.test("routing/filesystem: should sort routes using RFC matching priority", () => {
    const routes = inferFilesystemRoutes(
        [
            "site/pages/docs/[...parts].page.tsx",
            "site/pages/docs/[slug].page.tsx",
            "site/pages/docs/install.page.tsx",
            "site/pages/docs/v1/install.page.tsx",
            "site/pages/docs/changelog.page.tsx",
        ],
        {
            pagesDir: "site/pages",
            defaultMode: "ssg",
        },
    );

    assertEquals(routes.map((route) => route.path), [
        "/docs/v1/install",
        "/docs/changelog",
        "/docs/install",
        "/docs/:slug",
        "/docs/*",
    ]);
});
