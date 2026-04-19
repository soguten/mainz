/// <reference lib="deno.ns" />

import { resolve } from "node:path";
import { assertEquals } from "@std/assert";
import type { NormalizedMainzTarget } from "../../config/index.ts";
import {
    loadTargetBuildAppDefinition,
    loadTargetBuildRoutedAppDefinition,
} from "../app-definition.ts";

Deno.test("build/app-definition: should load root app definitions selected by appId", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-root-app-definition-" });

    try {
        await Deno.mkdir(resolve(cwd, "root-app", "src"), { recursive: true });
        await Deno.writeTextFile(
            resolve(cwd, "root-app", "src", "AppRoot.tsx"),
            [
                'import { Component } from "mainz";',
                "",
                "export class AppRoot extends Component {",
                "    override render() {",
                "        return <main>Root app</main>;",
                "    }",
                "}",
                "",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            resolve(cwd, "root-app", "src", "app.ts"),
            [
                'import { defineApp } from "mainz";',
                'import { AppRoot } from "./AppRoot.tsx";',
                "",
                "export const app = defineApp({",
                '    id: "root-app",',
                "    root: AppRoot,",
                "});",
                "",
            ].join("\n"),
        );

        const target: NormalizedMainzTarget = {
            name: "root-app",
            rootDir: "./root-app",
            appFile: "./root-app/src/app.ts",
            appId: "root-app",
            outDir: "dist/root-app",
        };

        const appDefinition = await loadTargetBuildAppDefinition(target, cwd);
        assertEquals(appDefinition?.id, "root-app");
        assertEquals("root" in appDefinition!, true);

        const routedAppDefinition = await loadTargetBuildRoutedAppDefinition(target, cwd);
        assertEquals(routedAppDefinition, undefined);
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});
