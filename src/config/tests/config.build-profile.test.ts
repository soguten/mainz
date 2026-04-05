/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import { normalizeMainzConfig, normalizeTargetBuildConfig } from "../index.ts";

Deno.test("config/build-profile: should normalize siteUrl for SEO publication metadata", () => {
    const config = normalizeTargetBuildConfig({
        profiles: {
            production: {
                siteUrl: "https://mainz.dev/",
            },
        },
    });

    assertEquals(config.profiles.production?.siteUrl, "https://mainz.dev");
});

Deno.test("config/build-profile: should reject non-absolute siteUrl", () => {
    assertThrows(() => {
        normalizeTargetBuildConfig({
            profiles: {
                production: {
                    siteUrl: "/mainz",
                },
            },
        });
    }, Error, "Invalid build profile siteUrl");
});

Deno.test("config/build-profile: should reject invalid navigation values", () => {
    assertThrows(() => {
        normalizeTargetBuildConfig({
            profiles: {
                production: {
                    navigation: "turbo" as never,
                },
            },
        });
    }, Error, "Unsupported navigation mode");
});

Deno.test("config/mainz: should reject legacy defaultNavigation", () => {
    assertThrows(() => {
        normalizeMainzConfig({
            targets: [
                {
                    name: "site",
                    rootDir: "./site",
                    viteConfig: "./vite.config.site.ts",
                    defaultNavigation: "spa" as never,
                },
            ],
        } as unknown as Parameters<typeof normalizeMainzConfig>[0]);
    }, Error, 'no longer supports "defaultNavigation"');
});

Deno.test("config/build-profile: should reject legacy overrideNavigation", () => {
    assertThrows(() => {
        normalizeTargetBuildConfig({
            profiles: {
                production: {
                    overrideNavigation: "spa" as never,
                },
            },
        } as unknown as Parameters<typeof normalizeTargetBuildConfig>[0]);
    }, Error, 'no longer support "overrideNavigation"');
});

Deno.test("config/mainz: should reject legacy defaultMode", () => {
    assertThrows(() => {
        normalizeMainzConfig({
            targets: [
                {
                    name: "site",
                    rootDir: "./site",
                    viteConfig: "./vite.config.site.ts",
                    defaultMode: "ssg" as never,
                },
            ],
        } as unknown as Parameters<typeof normalizeMainzConfig>[0]);
    }, Error, 'no longer supports "defaultMode"');
});

Deno.test("config/mainz: should reject legacy filesystemDefaultMode", () => {
    assertThrows(() => {
        normalizeMainzConfig({
            targets: [
                {
                    name: "site",
                    rootDir: "./site",
                    viteConfig: "./vite.config.site.ts",
                    filesystemDefaultMode: "ssg" as never,
                },
            ],
        } as unknown as Parameters<typeof normalizeMainzConfig>[0]);
    }, Error, 'no longer supports "filesystemDefaultMode"');
});

Deno.test("config/mainz: should reject legacy top-level render.modes", () => {
    assertThrows(() => {
        normalizeMainzConfig({
            targets: [
                {
                    name: "site",
                    rootDir: "./site",
                    viteConfig: "./vite.config.site.ts",
                    pagesDir: "./site/src/pages",
                },
            ],
            render: {
                modes: ["csr", "ssg"],
            },
        } as unknown as Parameters<typeof normalizeMainzConfig>[0]);
    }, Error, "Top-level render config is no longer supported");
});

Deno.test("config/mainz: should normalize authorization policy names per target", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "site",
                rootDir: "./site",
                viteConfig: "./vite.config.site.ts",
                authorization: {
                    policyNames: [" org-member ", "", "billing-admin", "org-member"],
                },
            },
        ],
    });

    assertEquals(config.targets[0]?.authorization?.policyNames, [
        "billing-admin",
        "org-member",
    ]);
});
