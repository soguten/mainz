/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { normalizeMainzConfig } from "../../config/index.ts";
import { resolveRouteManifestBuildInput } from "../route-manifest-input.ts";

Deno.test("build/route-manifest-input: should preserve discovered page modes", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "site",
                rootDir: "./site",
                viteConfig: "./vite.config.site.ts",
            },
        ],
    });

    const manifestInput = resolveRouteManifestBuildInput({
        target: config.targets[0],
        discoveredPages: [
            {
                file: "./site/pages/live.page.tsx",
                exportName: "LivePage",
                path: "/live",
                mode: "csr",
            },
            {
                file: "./site/pages/docs.page.tsx",
                exportName: "DocsPage",
                path: "/docs",
                mode: "ssg",
            },
        ],
    });

    assertEquals(
        manifestInput.discoveredPages?.map((page) => ({ path: page.path, mode: page.mode })),
        [
            { path: "/live", mode: "csr" },
            { path: "/docs", mode: "ssg" },
        ],
    );
});

Deno.test("build/route-manifest-input: should treat documentLanguage as a single app locale when app i18n is absent", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "docs",
                rootDir: "./docs-site",
                viteConfig: "./vite.config.docs.ts",
            },
        ],
    });

    const manifestInput = resolveRouteManifestBuildInput({
        target: config.targets[0],
        appDefinition: {
            id: "docs-app",
            documentLanguage: "pt-BR",
            pages: [],
        },
    });

    assertEquals(manifestInput.appLocales, ["pt-BR"]);
    assertEquals(manifestInput.appLocaleSource, "documentLanguage");
});

Deno.test("build/route-manifest-input: should mark app locales sourced from app i18n", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "docs",
                rootDir: "./docs-site",
                viteConfig: "./vite.config.docs.ts",
            },
        ],
    });

    const manifestInput = resolveRouteManifestBuildInput({
        target: config.targets[0],
        appDefinition: {
            id: "docs-app",
            i18n: {
                locales: ["en", "pt-BR"],
                defaultLocale: "en",
                localePrefix: "except-default",
            },
            pages: [],
        },
    });

    assertEquals(manifestInput.appLocales, ["en", "pt-BR"]);
    assertEquals(manifestInput.appLocaleSource, "i18n");
});
