/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { normalizeMainzConfig } from "../../config/index.ts";
import { resolveRouteManifestBuildInput } from "../route-manifest-input.ts";

Deno.test("build/route-manifest-input: should preserve discovered page modes without inventing a filesystem fallback", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "site",
                rootDir: "./site",
                viteConfig: "./vite.config.site.ts",
                pagesDir: "./site/pages",
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
                hasExplicitRenderMode: true,
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
    assertEquals("filesystemDefaultMode" in manifestInput.target, false);
});

Deno.test("build/route-manifest-input: should keep filesystem routing free of config-level render fallback", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "docs",
                rootDir: "./docs-site",
                viteConfig: "./vite.config.docs.ts",
                pagesDir: "./docs-site/pages",
            },
        ],
    });

    const manifestInput = resolveRouteManifestBuildInput({
        target: config.targets[0],
        filesystemPageFiles: [
            "./docs-site/pages/index.page.tsx",
        ],
    });

    assertEquals("filesystemDefaultMode" in manifestInput.target, false);
});
