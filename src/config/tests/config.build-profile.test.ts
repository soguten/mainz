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

Deno.test("config/build-profile: should reject invalid overrideNavigation values", () => {
    assertThrows(() => {
        normalizeTargetBuildConfig({
            profiles: {
                production: {
                    overrideNavigation: "turbo" as never,
                },
            },
        });
    }, Error, "Unsupported navigation mode");
});

Deno.test("config/mainz: should reject invalid defaultNavigation values", () => {
    assertThrows(() => {
        normalizeMainzConfig({
            targets: [
                {
                    name: "site",
                    rootDir: "./site",
                    viteConfig: "./vite.config.site.ts",
                    defaultNavigation: "turbo" as never,
                },
            ],
        });
    }, Error, "Unsupported navigation mode");
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
