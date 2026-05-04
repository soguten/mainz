/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { resolveDevRouteRequest } from "../dev-route-request.ts";

Deno.test("build/dev-route-request: should keep csr routes on the csr path", () => {
    const resolution = resolveDevRouteRequest({
        requestUrl: new URL("http://localhost/docs"),
        basePath: "/",
        manifest: {
            target: "docs",
            routes: [
                {
                    id: "docs:0",
                    source: "filesystem",
                    path: "/docs",
                    pattern: "/docs",
                    mode: "csr",
                    locales: ["en"],
                },
            ],
        },
    });

    assertEquals(resolution.kind, "csr");
    assertEquals(resolution.currentPath, "/docs");
});

Deno.test("build/dev-route-request: should classify matching static-entry ssg requests as ssg", () => {
    const resolution = resolveDevRouteRequest({
        requestUrl: new URL("http://localhost/stories/hello-from-di"),
        basePath: "/",
        manifest: {
            target: "site",
            routes: [
                {
                    id: "site:0",
                    source: "filesystem",
                    path: "/stories/:slug",
                    pattern: "/stories/:slug",
                    mode: "ssg",
                    locales: ["en"],
                },
            ],
        },
        routeEntriesByRouteId: new Map([
            ["site:0", [{ locale: "en", params: { slug: "hello-from-di" } }]],
        ]),
        defaultLocale: "en",
        localePrefix: "except-default",
    });

    assertEquals(resolution.kind, "ssg");
    assertEquals(resolution.params, { slug: "hello-from-di" });
});

Deno.test("build/dev-route-request: should classify missing dynamic ssg entries as 404 candidates", () => {
    const resolution = resolveDevRouteRequest({
        requestUrl: new URL("http://localhost/stories/missing"),
        basePath: "/",
        manifest: {
            target: "site",
            routes: [
                {
                    id: "site:0",
                    source: "filesystem",
                    path: "/stories/:slug",
                    pattern: "/stories/:slug",
                    mode: "ssg",
                    locales: ["en"],
                },
            ],
        },
        routeEntriesByRouteId: new Map([
            ["site:0", [{ locale: "en", params: { slug: "hello-from-di" } }]],
        ]),
        defaultLocale: "en",
        localePrefix: "except-default",
    });

    assertEquals(resolution.kind, "ssg-missing-entry");
    assertEquals(resolution.params, { slug: "missing" });
});

Deno.test("build/dev-route-request: should classify missing dynamic ssg entries with fallback csr", () => {
    const resolution = resolveDevRouteRequest({
        requestUrl: new URL("http://localhost/stories/missing"),
        basePath: "/",
        manifest: {
            target: "site",
            routes: [
                {
                    id: "site:0",
                    source: "filesystem",
                    path: "/stories/:slug",
                    pattern: "/stories/:slug",
                    mode: "ssg",
                    fallback: "csr",
                    locales: ["en"],
                },
            ],
        },
        routeEntriesByRouteId: new Map([
            ["site:0", [{ locale: "en", params: { slug: "hello-from-di" } }]],
        ]),
        defaultLocale: "en",
        localePrefix: "except-default",
    });

    assertEquals(resolution.kind, "ssg-csr-fallback");
    assertEquals(resolution.params, { slug: "missing" });
});

Deno.test("build/dev-route-request: should strip the locale prefix before matching routes", () => {
    const resolution = resolveDevRouteRequest({
        requestUrl: new URL("http://localhost/base/en/docs"),
        basePath: "/base/",
        manifest: {
            target: "docs",
            routes: [
                {
                    id: "docs:0",
                    source: "filesystem",
                    path: "/docs",
                    pattern: "/docs",
                    mode: "ssg",
                    locales: ["en", "pt-BR"],
                },
            ],
        },
        defaultLocale: "en",
        localePrefix: "always",
    });

    assertEquals(resolution.kind, "ssg");
    assertEquals(resolution.currentPath, "/docs");
    assertEquals(resolution.locale, "en");
});
