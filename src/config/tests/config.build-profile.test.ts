/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import { normalizeTargetBuildConfig } from "../index.ts";

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
    assertThrows(
        () => {
            normalizeTargetBuildConfig({
                profiles: {
                    production: {
                        siteUrl: "/mainz",
                    },
                },
            });
        },
        Error,
        "Invalid build profile siteUrl",
    );
});
