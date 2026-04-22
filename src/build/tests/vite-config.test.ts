/// <reference lib="deno.ns" />

import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { normalizeMainzConfig } from "../../config/index.ts";
import { MAINZ_PUBLIC_ENTRYPOINTS } from "../../config/public-entrypoints.ts";
import { resolveEffectiveNavigationMode, resolveTargetBuildProfile } from "../profiles.ts";
import { renderGeneratedViteConfigModule, resolveGeneratedViteConfig } from "../vite-config.ts";

Deno.test("build/vite-config: should generate framework aliases from public Mainz entrypoints", () => {
    const cwd = Deno.cwd();
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "site",
                rootDir: "./site",
            },
        ],
    });

    const generated = resolveGeneratedViteConfig({
        cwd,
        target: config.targets[0],
        modeOutDir: "dist/site/csr",
        renderMode: "csr",
        navigationMode: "spa",
        basePath: "/",
        appLocales: [],
        localePrefix: "except-default",
    });

    assertEquals(
        generated.aliases.filter((alias) => alias.framework).map((alias) => alias.find),
        MAINZ_PUBLIC_ENTRYPOINTS.map((entrypoint) => entrypoint.specifier),
    );
});

Deno.test("build/vite-config: should not alias Mainz to missing consumer project source files", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-consumer-vite-aliases-" });

    try {
        const config = normalizeMainzConfig({
            targets: [
                {
                    name: "site",
                    rootDir: "./site",
                },
            ],
        });

        const generated = resolveGeneratedViteConfig({
            cwd,
            target: config.targets[0],
            modeOutDir: "dist/site/csr",
            renderMode: "csr",
            navigationMode: "spa",
            basePath: "/",
            appLocales: [],
            localePrefix: "except-default",
        });

        assertEquals(
            generated.aliases.filter((alias) => alias.framework).map((alias) => alias.find),
            [],
        );
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/vite-config: should generate Mainz defaults and app extensions", () => {
    const cwd = Deno.cwd();
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "docs",
                rootDir: "./docs-site",
                vite: {
                    alias: {
                        "@docs": "./docs-site/src",
                    },
                    define: {
                        __DOCS_VERSION__: JSON.stringify("dev"),
                    },
                },
            },
        ],
    });

    const generated = resolveGeneratedViteConfig({
        cwd,
        target: config.targets[0],
        modeOutDir: "dist/docs/ssg",
        renderMode: "ssg",
        navigationMode: "enhanced-mpa",
        basePath: "/docs/",
        appLocales: ["en", "pt-BR"],
        defaultLocale: "en",
        localePrefix: "always",
        siteUrl: "https://mainz.dev",
    });

    assertEquals(generated.root, normalizePath(resolve(cwd, "docs-site")));
    assertEquals(generated.appType, "mpa");
    assertEquals(generated.base, "/docs/");
    assertEquals(generated.outDir, normalizePath(resolve(cwd, "dist/docs/ssg")));
    assertEquals(generated.define.__MAINZ_RENDER_MODE__, JSON.stringify("ssg"));
    assertEquals(generated.define.__MAINZ_NAVIGATION_MODE__, JSON.stringify("enhanced-mpa"));
    assertEquals(generated.define.__MAINZ_TARGET_NAME__, JSON.stringify("docs"));
    assertEquals(generated.define.__MAINZ_APP_LOCALES__, JSON.stringify(["en", "pt-BR"]));
    assertEquals(generated.define.__DOCS_VERSION__, JSON.stringify("dev"));

    const appAlias = generated.aliases.find((alias) => alias.find === "@docs");
    assert(appAlias);
    assertEquals(appAlias.replacement, normalizePath(resolve(cwd, "docs-site/src")));
});

Deno.test("build/vite-config: should render a Vite config module", () => {
    const cwd = Deno.cwd();
    const config = normalizeMainzConfig({
        targets: [
            {
                name: "site",
                rootDir: "./site",
            },
        ],
    });

    const generated = resolveGeneratedViteConfig({
        cwd,
        target: config.targets[0],
        modeOutDir: "dist/site/csr",
        renderMode: "csr",
        navigationMode: "spa",
        basePath: "/",
        appLocales: [],
        localePrefix: "except-default",
    });
    const moduleSource = renderGeneratedViteConfigModule(generated);

    assertStringIncludes(moduleSource, `import deno from "npm:@deno/vite-plugin@2.0.2";`);
    assertStringIncludes(moduleSource, `import { defineConfig } from "npm:vite";`);
    assertStringIncludes(moduleSource, `plugins: deno({`);
    assertStringIncludes(moduleSource, `preserveJsx: true`);
    assertStringIncludes(moduleSource, `appType: "spa"`);
    assertStringIncludes(moduleSource, `{ find: /^mainz$/, replacement:`);
    assertStringIncludes(moduleSource, `{ find: /^mainz\\/jsx-runtime$/, replacement:`);
    assertStringIncludes(moduleSource, `"__MAINZ_NAVIGATION_MODE__": "\\"spa\\""`);
});

Deno.test("build/vite-config: should use app-owned navigation for generated defaults", async () => {
    const fixture = await createAppFixture({
        navigation: "enhanced-mpa",
    });

    try {
        const config = normalizeMainzConfig({
            targets: [
                {
                    name: "site",
                    rootDir: "./site",
                    appFile: "./site/src/main.tsx",
                    appId: "site",
                },
            ],
        });
        const profile = await resolveTargetBuildProfile(config.targets[0], undefined, fixture.cwd);
        const navigationMode = await resolveEffectiveNavigationMode(
            config.targets[0],
            profile,
            fixture.cwd,
        );
        const generated = resolveGeneratedViteConfig({
            cwd: fixture.cwd,
            target: config.targets[0],
            modeOutDir: "dist/site/ssg",
            renderMode: "ssg",
            navigationMode,
            basePath: "./",
            appLocales: [],
            localePrefix: "except-default",
        });

        assertEquals(navigationMode, "enhanced-mpa");
        assertEquals(generated.appType, "mpa");
        assertEquals(generated.define.__MAINZ_NAVIGATION_MODE__, JSON.stringify("enhanced-mpa"));
    } finally {
        await Deno.remove(fixture.cwd, { recursive: true });
    }
});

Deno.test("build/vite-config: should fallback generated navigation defaults to spa", async () => {
    const fixture = await createAppFixture({});

    try {
        const config = normalizeMainzConfig({
            targets: [
                {
                    name: "site",
                    rootDir: "./site",
                    appFile: "./site/src/main.tsx",
                    appId: "site",
                },
            ],
        });
        const profile = await resolveTargetBuildProfile(config.targets[0], undefined, fixture.cwd);
        const navigationMode = await resolveEffectiveNavigationMode(
            config.targets[0],
            profile,
            fixture.cwd,
        );
        const generated = resolveGeneratedViteConfig({
            cwd: fixture.cwd,
            target: config.targets[0],
            modeOutDir: "dist/site/csr",
            renderMode: "csr",
            navigationMode,
            basePath: "/",
            appLocales: [],
            localePrefix: "except-default",
        });

        assertEquals(navigationMode, "spa");
        assertEquals(generated.appType, "spa");
        assertEquals(generated.define.__MAINZ_NAVIGATION_MODE__, JSON.stringify("spa"));
    } finally {
        await Deno.remove(fixture.cwd, { recursive: true });
    }
});

function normalizePath(path: string): string {
    return path.replaceAll("\\", "/");
}

async function createAppFixture(args: {
    navigation?: "spa" | "mpa" | "enhanced-mpa";
}): Promise<{ cwd: string }> {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-generated-vite-navigation-" });
    const siteDir = join(cwd, "site");
    await Deno.mkdir(join(siteDir, "src"), { recursive: true });
    await Deno.writeTextFile(
        join(siteDir, "src", "main.tsx"),
        [
            `import { defineApp } from ${
                JSON.stringify(pathToFileURL(join(Deno.cwd(), "src", "index.ts")).href)
            };`,
            "",
            "export const app = defineApp({",
            '  id: "site",',
            ...(args.navigation ? [`  navigation: ${JSON.stringify(args.navigation)},`] : []),
            "  pages: [],",
            "});",
            "",
        ].join("\n"),
    );

    return { cwd };
}
