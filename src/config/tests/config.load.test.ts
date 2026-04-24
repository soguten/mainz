/// <reference lib="deno.ns" />

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertEquals, assertStringIncludes } from "@std/assert";
import type { MainzToolingPlatform } from "../../tooling/platform/index.ts";
import { loadMainzConfig } from "../index.ts";

Deno.test("config/load: should load config modules through the supplied tooling platform", async () => {
    const seenSpecifiers: string[] = [];
    const platform: MainzToolingPlatform = {
        name: "deno",
        cwd: () => Deno.cwd(),
        readTextFile: async () => "",
        writeTextFile: async () => undefined,
        readDir: async function* () {},
        mkdir: async () => undefined,
        remove: async () => undefined,
        stat: async () => ({ isFile: true, isDirectory: false }),
        makeTempDir: async () => "",
        run: async () => ({ success: true, code: 0 }),
        resolveViteBuildCommand: () => ({ command: "deno", args: [] }),
        resolveViteDevCommand: () => ({ command: "deno", args: [] }),
        importModule: async <T>(specifier: string): Promise<T> => {
            seenSpecifiers.push(specifier);
            return {
                default: {
                    targets: [
                        {
                            name: "site",
                            rootDir: "./site",
                        },
                    ],
                },
            } as T;
        },
    };

    const loaded = await loadMainzConfig("./mainz.config.ts", platform);

    assertEquals(loaded.path, resolve("./mainz.config.ts"));
    assertEquals(loaded.config.targets[0].name, "site");
    assertEquals(seenSpecifiers.length, 1);
    assertStringIncludes(
        seenSpecifiers[0],
        `${pathToFileURL(resolve("./mainz.config.ts")).href}?t=`,
    );
});
