/// <reference lib="deno.ns" />

import { assertEquals, assertRejects } from "@std/assert";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeMainzConfig } from "../../config/index.ts";
import {
    applyBuildProfileOverrides,
    resolvePublicationMetadata,
    resolveTargetBuildProfile,
} from "../profiles.ts";

Deno.test("build/profiles: should load explicit target build config profiles", async () => {
    const fixture = await createTargetBuildFixture(
        `import { defineTargetBuild } from "mainz/config";

         export default defineTargetBuild({
             profiles: {
                 dev: {
                     navigation: "spa",
                 },
                 "gh-pages": {
                     basePath: "/mainz",
                     navigation: "enhanced-mpa",
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
                    pagesDir: "./site/src/pages",
                    buildConfig: fixture.relativeConfigPath,
                },
            ],
        });

        const profile = await resolveTargetBuildProfile(config.targets[0], "gh-pages", fixture.cwd);

        assertEquals(profile, {
            name: "gh-pages",
            basePath: "/mainz/",
            navigation: "enhanced-mpa",
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
                 dev: {
                     navigation: "spa",
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
                    pagesDir: "./site/src/pages",
                },
            ],
        });

        const profile = await resolveTargetBuildProfile(config.targets[0], "dev", fixture.cwd);

        assertEquals(profile, {
            name: "dev",
            basePath: "/",
            navigation: "spa",
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
            outDir: "dist/site",
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
                    pagesDir: "./site/src/pages",
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

Deno.test("build/profiles: should let profile navigation override app navigation intent", async () => {
    const fixture = await createTargetBuildFixture(
        `export default {
             profiles: {
                 production: {
                     navigation: "mpa",
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
            "production",
            fixture.cwd,
        );

        assertEquals(metadata.navigation, "mpa");
    } finally {
        await Deno.remove(fixture.cwd, { recursive: true });
    }
});

Deno.test("build/profiles: should derive spa navigation defaults when no app or profile declares one", async () => {
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
                    pagesDir: "./site/src/pages",
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

Deno.test("build/profiles: should allow explicit CLI navigation override without changing publication metadata shape", async () => {
    const fixture = await createTargetBuildFixture(
        `export default {
             profiles: {
                 production: {
                     basePath: "/docs/",
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

        const profile = applyBuildProfileOverrides(
            await resolveTargetBuildProfile(config.targets[0], undefined, fixture.cwd),
            { navigation: "spa" },
        );
        const metadata = await resolvePublicationMetadata(
            config.targets[0],
            undefined,
            fixture.cwd,
            {
                navigation: "spa",
            },
        );

        assertEquals(profile.navigation, "spa");
        assertEquals(profile.basePath, "/docs/");
        assertEquals(metadata.navigation, "spa");
        assertEquals(metadata.outDir, "dist/site");
        assertEquals(metadata.basePath, "/docs/");
    } finally {
        await Deno.remove(fixture.cwd, { recursive: true });
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
            `import { defineApp } from ${JSON.stringify(pathToFileURL(join(Deno.cwd(), "src", "index.ts")).href)};`,
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
