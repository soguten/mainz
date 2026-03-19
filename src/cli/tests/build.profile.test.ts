/// <reference lib="deno.ns" />

import { assertEquals, assertRejects } from "@std/assert";
import { join } from "node:path";
import { normalizeMainzConfig } from "../../config/index.ts";
import {
    applyBuildCliOverrides,
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
            overrideNavigation: "spa",
        },
        "gh-pages": {
            basePath: "/mainz",
            overrideNavigation: "enhanced-mpa",
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
                    defaultMode: "ssg",
                },
            ],
        });

        const profile = await resolveTargetBuildProfile(config.targets[0], "gh-pages", fixture.cwd);

        assertEquals(profile, {
            name: "gh-pages",
            basePath: "/mainz/",
            overridePageMode: undefined,
            overrideNavigation: "enhanced-mpa",
            siteUrl: "https://mainz.dev",
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
            overrideNavigation: "spa",
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
            overrideNavigation: "spa",
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
                    pagesDir: "./site/src/pages",
                    buildConfig: fixture.relativeConfigPath,
                    outDir: "dist/site",
                    defaultMode: "ssg",
                    defaultNavigation: "enhanced-mpa",
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
            artifactDir: "dist/site/ssg",
            basePath: "/mainz/",
            renderMode: "ssg",
            navigationMode: "enhanced-mpa",
            siteUrl: "https://mainz.dev",
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

Deno.test("cli/build profiles: should derive navigation defaults when target does not configure one", async () => {
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
                    defaultMode: "ssg",
                },
                {
                    name: "playground",
                    rootDir: "./playground",
                    viteConfig: "./vite.config.playground.ts",
                    outDir: "dist/playground",
                    defaultMode: "csr",
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

        assertEquals(siteMetadata.navigationMode, "enhanced-mpa");
        assertEquals(playgroundMetadata.navigationMode, "spa");
    } finally {
        await Deno.remove(fixture.cwd, { recursive: true });
    }
});

Deno.test("cli/build profiles: should allow explicit navigation override without requiring a profile variant", async () => {
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
                    pagesDir: "./site/src/pages",
                    buildConfig: fixture.relativeConfigPath,
                    outDir: "dist/site",
                    defaultMode: "ssg",
                    defaultNavigation: "enhanced-mpa",
                },
            ],
        });

        const profile = applyBuildCliOverrides(
            await resolveTargetBuildProfile(config.targets[0], undefined, fixture.cwd),
            { navigation: "spa" },
        );
        const metadata = await resolvePublicationMetadata(
            config.targets[0],
            undefined,
            fixture.cwd,
            {
                mode: "csr",
                navigation: "spa",
            },
        );

        assertEquals(profile.overrideNavigation, "spa");
        assertEquals(profile.basePath, "/docs/");
        assertEquals(metadata.navigationMode, "spa");
        assertEquals(metadata.renderMode, "csr");
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

    return { cwd, relativeConfigPath };
}
