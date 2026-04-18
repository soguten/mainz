/// <reference lib="deno.ns" />

import { assertEquals, assertThrows } from "@std/assert";
import { normalizeMainzConfig } from "../index.ts";

Deno.test("config/target-vite: should allow targets without viteConfig", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "site",
                rootDir: "./site",
            },
        ],
    });

    assertEquals(config.targets[0].viteConfig, undefined);
});

Deno.test("config/target-vite: should keep explicit viteConfig as the advanced path", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "legacy-site",
                rootDir: "./legacy-site",
                viteConfig: " ./legacy-site/vite.config.ts ",
            },
        ],
    });

    assertEquals(config.targets[0].viteConfig, "./legacy-site/vite.config.ts");
});

Deno.test("config/target-vite: should reject viteConfig and generated vite extensions together", () => {
    assertThrows(
        () => {
            normalizeMainzConfig({
                targets: [
                    {
                        name: "site",
                        rootDir: "./site",
                        viteConfig: "./vite.config.ts",
                        vite: {
                            define: {
                                __APP_VERSION__: JSON.stringify("dev"),
                            },
                        },
                    },
                ],
            });
        },
        Error,
        "must not define both viteConfig and vite",
    );
});

Deno.test("config/target-vite: should reject app aliases that override Mainz framework aliases", () => {
    assertThrows(
        () => {
            normalizeMainzConfig({
                targets: [
                    {
                        name: "site",
                        rootDir: "./site",
                        vite: {
                            alias: {
                                "mainz/http": "./fake-http.ts",
                            },
                        },
                    },
                ],
            });
        },
        Error,
        "cannot override Mainz framework aliases",
    );
});

Deno.test("config/target-vite: should reject app defines that override Mainz framework defines", () => {
    assertThrows(
        () => {
            normalizeMainzConfig({
                targets: [
                    {
                        name: "site",
                        rootDir: "./site",
                        vite: {
                            define: {
                                __MAINZ_BASE_PATH__: JSON.stringify("/docs/"),
                            },
                        },
                    },
                ],
            });
        },
        Error,
        "cannot override Mainz framework defines",
    );
});

Deno.test("config/target-vite: should normalize simple alias and define extensions", () => {
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "site",
                rootDir: "./site",
                vite: {
                    alias: {
                        " @site ": " ./site/src ",
                    },
                    define: {
                        " __APP_VERSION__ ": JSON.stringify("dev"),
                    },
                },
            },
        ],
    });

    assertEquals(config.targets[0].vite, {
        alias: {
            "@site": "./site/src",
        },
        define: {
            __APP_VERSION__: JSON.stringify("dev"),
        },
    });
});
