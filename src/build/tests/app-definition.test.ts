/// <reference lib="deno.ns" />

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertEquals } from "@std/assert";
import type { NormalizedMainzTarget } from "../../config/index.ts";
import {
    loadTargetBuildAppDefinition,
    loadTargetBuildRoutedAppDefinition,
} from "../app-definition.ts";
import { resolveDefinedAppDefinitionsFromModuleExports } from "../../navigation/index.ts";

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

Deno.test("build/app-definition: should detect exported apps branded from another package instance", () => {
    const foreignApp = {
        id: "foreign-app",
        pages: [],
        [Symbol.for("mainz.appDefinitionKind")]: "routed",
    };

    const resolved = resolveDefinedAppDefinitionsFromModuleExports({
        app: foreignApp,
    });

    assertEquals(resolved, [foreignApp]);
});

Deno.test("build/app-definition: should capture non-exported routed apps defined from another package instance", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-routed-app-capture-" });

    try {
        await Deno.mkdir(resolve(cwd, "routed-app", "src"), { recursive: true });
        const foreignMainzEntryUrl =
            `${pathToFileURL(resolve(Deno.cwd(), "src", "index.ts")).href}?foreign-app-capture=${
                crypto.randomUUID()
            }`;

        await Deno.writeTextFile(
            resolve(cwd, "routed-app", "src", "Home.page.tsx"),
            [
                'import { Page, Route } from "mainz";',
                "",
                '@Route("/")',
                "export class HomePage extends Page {",
                "    override render() {",
                "        return <main>Home</main>;",
                "    }",
                "}",
                "",
            ].join("\n"),
        );
        await Deno.writeTextFile(
            resolve(cwd, "routed-app", "src", "app.ts"),
            [
                `import { defineApp, startApp } from ${JSON.stringify(foreignMainzEntryUrl)};`,
                'import { HomePage } from "./Home.page.tsx";',
                "",
                "const app = defineApp({",
                '    id: "routed-app",',
                "    pages: [HomePage],",
                "});",
                "",
                "startApp(app);",
                "",
            ].join("\n"),
        );

        const target: NormalizedMainzTarget = {
            name: "routed-app",
            rootDir: "./routed-app",
            appFile: "./routed-app/src/app.ts",
            appId: "routed-app",
            outDir: "dist/routed-app",
        };

        const appDefinition = await loadTargetBuildAppDefinition(target, cwd);
        assertEquals(appDefinition?.id, "routed-app");
        assertEquals("pages" in appDefinition!, true);
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/app-definition: should capture non-exported root apps defined from another package instance", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-root-app-capture-" });

    try {
        await Deno.mkdir(resolve(cwd, "root-app", "src"), { recursive: true });
        const foreignMainzEntryUrl =
            `${pathToFileURL(resolve(Deno.cwd(), "src", "index.ts")).href}?foreign-root-app-capture=${
                crypto.randomUUID()
            }`;

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
                `import { defineApp, startApp } from ${JSON.stringify(foreignMainzEntryUrl)};`,
                'import { AppRoot } from "./AppRoot.tsx";',
                "",
                "const app = defineApp({",
                '    id: "root-app",',
                "    root: AppRoot,",
                "});",
                "",
                "startApp(app);",
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
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});
