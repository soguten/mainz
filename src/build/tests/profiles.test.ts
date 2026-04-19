/// <reference lib="deno.ns" />

import { assertEquals, assertRejects } from "@std/assert";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeMainzConfig } from "../../config/index.ts";
import { resolvePublicationMetadata, resolveTargetBuildProfile } from "../profiles.ts";

Deno.test("build/profiles: should load explicit target build config profiles", async () => {
    const fixture = await createTargetBuildFixture(
        `import { defineTargetBuild } from "mainz/config";

         export default defineTargetBuild({
             profiles: {
                 dev: {},
                 "gh-pages": {
                     basePath: "/mainz",
                     siteUrl: "https://mainz.dev",
                 },
             },
         });
        `,
    );

    try {
        const config = normalizeMainzConfig({
            targets: [
                {
                    name: "site",
                    rootDir: "./site",
                    viteConfig: "./vite.config.site.ts",
                    buildConfig: fixture.relativeConfigPath,
                },
            ],
        });

        const profile = await resolveTargetBuildProfile(config.targets[0], "gh-pages", fixture.cwd);

        assertEquals(profile, {
            name: "gh-pages",
            basePath: "/mainz/",
            siteUrl: "https://mainz.dev",
        });
    } finally {
        await Deno.remove(fixture.cwd, { recursive: true });
    }
});

Deno.test("build/profiles: should discover rootDir mainz.build.ts automatically", async () => {
    const fixture = await createTargetBuildFixture(
        `export default {
             profiles: {
                 dev: {},
             },
         };
        `,
    );

    try {
        const config = normalizeMainzConfig({
            targets: [
                {
                    name: "site",
                    rootDir: "./site",
                    viteConfig: "./vite.config.site.ts",
                },
            ],
        });

        const profile = await resolveTargetBuildProfile(config.targets[0], "dev", fixture.cwd);

        assertEquals(profile, {
            name: "dev",
            basePath: "/",
            siteUrl: undefined,
        });
    } finally {
        await Deno.remove(fixture.cwd, { recursive: true });
    }
});

Deno.test("build/profiles: should resolve publication metadata from profile and app navigation intent", async () => {
    const fixture = await createTargetBuildFixture(
        `export default {
             profiles: {
                 "gh-pages": {
                     basePath: "/mainz/",
                     siteUrl: "https://mainz.dev/",
                 },
             },
         };
        `,
    );

    try {
        const config = normalizeMainzConfig({
            targets: [
                {
                    name: "site",
                    rootDir: "./site",
                    viteConfig: "./vite.config.site.ts",
                    buildConfig: fixture.relativeConfigPath,
                    outDir: "dist/site",
                    appFile: "./site/src/main.tsx",
                },
            ],
        });

        const metadata = await resolvePublicationMetadata(
            config.targets[0],
            "gh-pages",
            fixture.cwd,
        );

        assertEquals(metadata, {
            target: "site",
            profile: "gh-pages",
            outDir: "dist/site/csr",
            basePath: "/mainz/",
            navigation: "spa",
            siteUrl: "https://mainz.dev",
        });
    } finally {
        await Deno.remove(fixture.cwd, { recursive: true });
    }
});

Deno.test("build/profiles: should fail for unknown custom profile", async () => {
    const fixture = await createTargetBuildFixture(
        `export default {
             profiles: {
                 production: {},
             },
         };
        `,
    );

    try {
        const config = normalizeMainzConfig({
            targets: [
                {
                    name: "site",
                    rootDir: "./site",
                    viteConfig: "./vite.config.site.ts",
                    buildConfig: fixture.relativeConfigPath,
                },
            ],
        });

        await assertRejects(
            () => resolveTargetBuildProfile(config.targets[0], "gh-pages", fixture.cwd),
            Error,
            'does not define profile "gh-pages"',
        );
    } finally {
        await Deno.remove(fixture.cwd, { recursive: true });
    }
});

Deno.test("build/profiles: should resolve publication metadata from the app selected by target appId", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-build-profile-app-selection-" });
    const siteDir = join(cwd, "site");

    try {
        await Deno.mkdir(join(siteDir, "src"), { recursive: true });
        await Deno.writeTextFile(
            join(siteDir, "src", "apps.ts"),
            [
                `import { defineApp } from ${
                    JSON.stringify(pathToFileURL(join(Deno.cwd(), "src", "index.ts")).href)
                };`,
                "",
                "export const alphaApp = defineApp({",
                '  id: "alpha-app",',
                '  navigation: "spa",',
                "  pages: [],",
                "});",
                "",
                "export const betaApp = defineApp({",
                '  id: "beta-app",',
                '  navigation: "mpa",',
                "  pages: [],",
                "});",
                "",
            ].join("\n"),
        );

        const config = normalizeMainzConfig({
            targets: [
                {
                    name: "site",
                    rootDir: "./site",
                    viteConfig: "./vite.config.site.ts",
                    outDir: "dist/site",
                    appFile: "./site/src/apps.ts",
                    appId: "beta-app",
                },
            ],
        });

        const metadata = await resolvePublicationMetadata(
            config.targets[0],
            "production",
            cwd,
        );

        assertEquals(metadata.navigation, "mpa");
        assertEquals(metadata.outDir, "dist/site/ssg");
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

Deno.test("build/profiles: should derive spa navigation defaults when no app declares one", async () => {
    const fixture = await createTargetBuildFixture(
        `export default {
             profiles: {
                 production: {},
             },
         };
        `,
    );

    try {
        const config = normalizeMainzConfig({
            targets: [
                {
                    name: "site",
                    rootDir: "./site",
                    viteConfig: "./vite.config.site.ts",
                    buildConfig: fixture.relativeConfigPath,
                    outDir: "dist/site",
                },
                {
                    name: "playground",
                    rootDir: "./playground",
                    viteConfig: "./vite.config.playground.ts",
                    outDir: "dist/playground",
                },
            ],
        });

        const siteMetadata = await resolvePublicationMetadata(
            config.targets[0],
            "production",
            fixture.cwd,
        );
        const playgroundMetadata = await resolvePublicationMetadata(
            config.targets[1],
            "production",
            fixture.cwd,
        );

        assertEquals(siteMetadata.navigation, "spa");
        assertEquals(playgroundMetadata.navigation, "spa");
    } finally {
        await Deno.remove(fixture.cwd, { recursive: true });
    }
});

Deno.test("build/profiles: publication outDir should assemble a Pages artifact without an extra mode segment", async () => {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-pages-artifact-" });

    try {
        const publicationOutDir = join(cwd, "dist", "artifact", "ssg");
        const stagingDir = join(cwd, "_pages");

        await Deno.mkdir(join(publicationOutDir, "assets"), { recursive: true });
        await Deno.writeTextFile(
            join(publicationOutDir, "index.html"),
            "<html><body>artifact</body></html>",
        );
        await Deno.writeTextFile(
            join(publicationOutDir, "assets", "artifact.js"),
            "console.log('artifact');",
        );

        await Deno.mkdir(stagingDir, { recursive: true });
        await copyDirectoryContents(publicationOutDir, stagingDir);

        assertEquals(await pathExists(join(stagingDir, "index.html")), true);
        assertEquals(await pathExists(join(stagingDir, "ssg", "index.html")), false);
    } finally {
        await Deno.remove(cwd, { recursive: true });
    }
});

async function createTargetBuildFixture(
    source: string,
): Promise<{ cwd: string; relativeConfigPath: string }> {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-build-profile-" });
    const siteDir = join(cwd, "site");
    await Deno.mkdir(siteDir, { recursive: true });

    const relativeConfigPath = "./site/custom.build.ts";
    await Deno.writeTextFile(join(siteDir, "custom.build.ts"), source);
    await Deno.writeTextFile(join(siteDir, "mainz.build.ts"), source);
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
            '  navigation: "spa",',
            "  pages: [],",
            "});",
            "",
        ].join("\n"),
    );

    return { cwd, relativeConfigPath };
}

async function copyDirectoryContents(sourceDir: string, destinationDir: string): Promise<void> {
    for await (const entry of Deno.readDir(sourceDir)) {
        const sourcePath = join(sourceDir, entry.name);
        const destinationPath = join(destinationDir, entry.name);

        if (entry.isDirectory) {
            await Deno.mkdir(destinationPath, { recursive: true });
            await copyDirectoryContents(sourcePath, destinationPath);
            continue;
        }

        await Deno.copyFile(sourcePath, destinationPath);
    }
}

async function pathExists(path: string): Promise<boolean> {
    try {
        await Deno.stat(path);
        return true;
    } catch {
        return false;
    }
}
