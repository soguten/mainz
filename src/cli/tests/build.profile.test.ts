/// <reference lib="deno.ns" />

import { assertEquals, assertRejects } from "@std/assert";
import { join } from "node:path";
import { normalizeMainzConfig } from "../../config/index.ts";
import {
    resolvePublicationMetadata,
    resolveTargetBuildProfile,
} from "../build.ts";

Deno.test("cli/build profiles: should load explicit target build config profiles", async () => {
    const fixture = await createTargetBuildFixture(
        `import { defineTargetBuild } from "mainz/config";

export default defineTargetBuild({
    profiles: {
        dev: {
            overridePageMode: "csr",
        },
        "gh-pages": {
            basePath: "/mainz",
            siteUrl: "https://mainz.soguten.com",
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
                    defaultMode: "ssg",
                },
            ],
        });

        const profile = await resolveTargetBuildProfile(config.targets[0], "gh-pages", fixture.cwd);

        assertEquals(profile, {
            name: "gh-pages",
            basePath: "/mainz/",
            overridePageMode: undefined,
            siteUrl: "https://mainz.soguten.com",
        });
    } finally {
        await Deno.remove(fixture.cwd, { recursive: true });
    }
});

Deno.test("cli/build profiles: should discover rootDir mainz.build.ts automatically", async () => {
    const fixture = await createTargetBuildFixture(
        `export default {
    profiles: {
        dev: {
            overridePageMode: "csr",
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
                    defaultMode: "ssg",
                },
            ],
        });

        const profile = await resolveTargetBuildProfile(config.targets[0], "dev", fixture.cwd);

        assertEquals(profile, {
            name: "dev",
            basePath: "/",
            overridePageMode: "csr",
            siteUrl: undefined,
        });
    } finally {
        await Deno.remove(fixture.cwd, { recursive: true });
    }
});

Deno.test("cli/build profiles: should resolve publication metadata from profile and target defaults", async () => {
    const fixture = await createTargetBuildFixture(
        `export default {
    profiles: {
        "gh-pages": {
            basePath: "/mainz/",
            siteUrl: "https://mainz.soguten.com/",
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
                    buildConfig: fixture.relativeConfigPath,
                    outDir: "dist/site",
                    defaultMode: "ssg",
                },
            ],
        });

        const metadata = await resolvePublicationMetadata(config.targets[0], "gh-pages", fixture.cwd);

        assertEquals(metadata, {
            target: "site",
            profile: "gh-pages",
            artifactDir: "dist/site/ssg",
            basePath: "/mainz/",
            renderMode: "ssg",
            siteUrl: "https://mainz.soguten.com",
        });
    } finally {
        await Deno.remove(fixture.cwd, { recursive: true });
    }
});

Deno.test("cli/build profiles: should fail for unknown custom profile", async () => {
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

async function createTargetBuildFixture(source: string): Promise<{ cwd: string; relativeConfigPath: string }> {
    const cwd = await Deno.makeTempDir({ prefix: "mainz-build-profile-" });
    const siteDir = join(cwd, "site");
    await Deno.mkdir(siteDir, { recursive: true });

    const relativeConfigPath = "./site/custom.build.ts";
    await Deno.writeTextFile(join(siteDir, "custom.build.ts"), source);
    await Deno.writeTextFile(join(siteDir, "mainz.build.ts"), source);

    return { cwd, relativeConfigPath };
}
