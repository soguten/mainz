/// <reference lib="deno.ns" />

import { resolve } from "node:path";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { denoToolingRuntime } from "../../tooling/runtime/deno.ts";
import {
    instantiateTemplate,
    materializeTemplate,
    resolveBuiltInTemplateRoot,
} from "../templates/index.ts";

Deno.test("cli/templates/project: empty deno should materialize the shared project template", async () => {
    const plan = await instantiateTemplate({
        runtime: denoToolingRuntime,
        templateRoot: resolveBuiltInTemplateRoot("project", "deno/empty"),
        params: {
            mainzSpecifier: "jsr:@mainz/mainz@0.1.0-alpha.99",
            denoConfigPath: "deno.json",
            mainzCliSpecifier: "jsr:@mainz/cli-deno@0.1.0-alpha.99",
            mainzSubpathPrefix: "jsr:/@mainz/mainz@0.1.0-alpha.99/",
        },
    });

    assertEquals(
        plan.files.map((file) => file.path).sort(),
        ["deno.json", "mainz.config.ts"],
    );

    const config = plan.files.find((file) => file.path === "mainz.config.ts");
    assertStringIncludes(config?.content ?? "", 'runtime: "deno"');

    const denoConfig = plan.files.find((file) => file.path === "deno.json");
    assertStringIncludes(
        denoConfig?.content ?? "",
        '"mainz": "jsr:@mainz/mainz@0.1.0-alpha.99"',
    );
});

Deno.test("cli/templates/project: starter deno should materialize a routed app with a counter", async () => {
    const plan = await instantiateTemplate({
        runtime: denoToolingRuntime,
        templateRoot: resolveBuiltInTemplateRoot("project", "deno/starter"),
        params: {
            mainzSpecifier: "jsr:@mainz/mainz@0.1.0-alpha.99",
            denoConfigPath: "deno.json",
            mainzCliSpecifier: "jsr:@mainz/cli-deno@0.1.0-alpha.99",
            mainzSubpathPrefix: "jsr:/@mainz/mainz@0.1.0-alpha.99/",
            projectName: "demo",
            appName: "app",
            appId: "app",
            appNavigation: "enhanced-mpa",
            appTitle: "demo",
            customElementPrefix: "x-mainz-demo",
            rootDir: "./app",
            outDir: "dist/app",
        },
    });
    const files = new Map(plan.files.map((file) => [file.path.replaceAll("\\", "/"), file]));

    assertEquals(
        [...files.keys()].sort(),
        [
            "app/deno.json",
            "app/index.html",
            "app/src/app.ts",
            "app/src/components/Counter.tsx",
            "app/src/main.tsx",
            "app/src/pages/Home.page.tsx",
            "app/src/pages/NotFound.page.tsx",
            "deno.json",
            "mainz.config.ts",
        ],
    );

    const config = files.get("mainz.config.ts");
    assertStringIncludes(config?.content ?? "", 'runtime: "deno"');
    assertStringIncludes(config?.content ?? "", 'name: "app"');
    assertStringIncludes(config?.content ?? "", 'appFile: "./app/src/app.ts"');

    const homePage = files.get("app/src/pages/Home.page.tsx");
    assertStringIncludes(
        homePage?.content ?? "",
        'import { Counter } from "../components/Counter.tsx";',
    );
    assertStringIncludes(homePage?.content ?? "", "<Counter />");

    const counter = files.get("app/src/components/Counter.tsx");
    assertEquals(counter?.content.includes("@CustomElement"), false);
    assertStringIncludes(counter?.content ?? "", "this.setState({ count: this.state.count + 1 })");
});

Deno.test("cli/templates/app: default-routed should render shared target metadata", async () => {
    const plan = await instantiateTemplate({
        runtime: denoToolingRuntime,
        templateRoot: resolveBuiltInTemplateRoot("app", "default-routed"),
        params: {
            appName: "site",
            appId: "site",
            appNavigation: "enhanced-mpa",
            appTitle: "site",
            customElementPrefix: "x-mainz-site",
            rootDir: "./site",
            outDir: "dist/site",
        },
    });

    assertEquals(plan.manifest.target, {
        name: "site",
        rootDir: "./site",
        appFile: "./site/src/app.ts",
        appId: "site",
        outDir: "dist/site",
    });
});

Deno.test("cli/templates/project: materialize should preflight every destination before writing", async () => {
    const outputDir = await Deno.makeTempDir({ prefix: "mainz-template-preflight-" });

    try {
        await assertRejects(
            () =>
                materializeTemplate({
                    runtime: denoToolingRuntime,
                    templateRoot: resolveBuiltInTemplateRoot("project", "deno/empty"),
                    outputDir,
                    params: {
                        mainzSpecifier: "jsr:@mainz/mainz@0.1.0-alpha.99",
                        denoConfigPath: "deno.json",
                        mainzCliSpecifier: "jsr:@mainz/cli-deno@0.1.0-alpha.99",
                        mainzSubpathPrefix: "jsr:/@mainz/mainz@0.1.0-alpha.99/",
                    },
                    async beforeWrite(path) {
                        if (path.endsWith("mainz.config.ts")) {
                            throw new Error("Refusing to overwrite existing file");
                        }
                    },
                }),
            Error,
            "Refusing to overwrite existing file",
        );

        await assertRejects(
            () => Deno.stat(resolve(outputDir, "mainz.config.ts")),
            Deno.errors.NotFound,
        );
        await assertRejects(() => Deno.stat(resolve(outputDir, "deno.json")), Deno.errors.NotFound);
    } finally {
        await Deno.remove(outputDir, { recursive: true });
    }
});
