/// <reference lib="deno.ns" />

import { assertEquals, assertRejects } from "@std/assert";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeMainzConfig } from "../../config/index.ts";
import {
  resolvePublicationMetadata,
  resolveTargetBuildProfile,
} from "../profiles.ts";

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

    const profile = await resolveTargetBuildProfile(
      config.targets[0],
      "gh-pages",
      fixture.cwd,
    );

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

    const profile = await resolveTargetBuildProfile(
      config.targets[0],
      "dev",
      fixture.cwd,
    );

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
      outDir: "dist/site",
      basePath: "/mainz/",
      navigation: "spa",
      siteUrl: "https://mainz.dev",
      capabilities: {
        artifactClass: "browser-only",
        serverRuntimeRequired: false,
      },
      browser: {
        outDir: "dist/site/browser",
        routesManifestPath: "dist/site/browser/routes.json",
        hydrationManifestPath: "dist/site/browser/hydration.json",
        indexHtmlPath: "dist/site/browser/index.html",
      },
      server: {
        outDir: "dist/site/server",
        ssrManifestPath: "dist/site/server/ssr-manifest.json",
        entryPath: "dist/site/server/app.mjs",
      },
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
      () =>
        resolveTargetBuildProfile(config.targets[0], "gh-pages", fixture.cwd),
      Error,
      'does not define profile "gh-pages"',
    );
  } finally {
    await Deno.remove(fixture.cwd, { recursive: true });
  }
});

Deno.test("build/profiles: should resolve publication metadata from the app selected by target appId", async () => {
  const cwd = await Deno.makeTempDir({
    prefix: "mainz-build-profile-app-selection-",
  });
  const siteDir = join(cwd, "site");

  try {
    await Deno.mkdir(join(siteDir, "src"), { recursive: true });
    await Deno.writeTextFile(
      join(siteDir, "src", "apps.ts"),
      [
        `import { defineApp } from ${
          JSON.stringify(
            pathToFileURL(join(Deno.cwd(), "src", "index.ts")).href,
          )
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
    assertEquals(metadata.outDir, "dist/site");
    assertEquals(metadata.capabilities, {
      artifactClass: "browser-only",
      serverRuntimeRequired: false,
    });
    assertEquals(metadata.browser.outDir, "dist/site/browser");
    assertEquals(metadata.server.outDir, "dist/site/server");
  } finally {
    await Deno.remove(cwd, { recursive: true });
  }
});

Deno.test("build/profiles: should classify targets with SSR pages as server-capable", async () => {
  const fixture = await createTargetBuildFixture(
    `export default {
             profiles: {
                 production: {},
             },
         };
        `,
    {
      appSource: [
        `import { defineApp } from ${
          JSON.stringify(pathToFileURL(join(Deno.cwd(), "src", "index.ts")).href)
        };`,
        'import { HomePage } from "./HomePage.ts";',
        "",
        "export const app = defineApp({",
        '  id: "site",',
        '  navigation: "spa",',
        "  pages: [HomePage],",
        "});",
        "",
      ].join("\n"),
      files: {
        "src/HomePage.ts": [
          `import { Page, RenderMode, Route } from ${
            JSON.stringify(
              pathToFileURL(join(Deno.cwd(), "src", "index.ts")).href,
            )
          };`,
          "",
          '@Route("/")',
          '@RenderMode("ssr")',
          "export class HomePage extends Page {",
          "  override render(): HTMLElement {",
          '    return document.createElement("main");',
          "  }",
          "}",
          "",
        ].join("\n"),
      },
    },
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

    assertEquals(metadata.capabilities, {
      artifactClass: "server-capable",
      serverRuntimeRequired: true,
    });
  } finally {
    await Deno.remove(fixture.cwd, { recursive: true });
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

Deno.test("build/profiles: publication outDir should assemble a Pages artifact without an extra nested mode segment", async () => {
  const cwd = await Deno.makeTempDir({ prefix: "mainz-pages-artifact-" });

  try {
    const publicationOutDir = join(cwd, "dist", "artifact");
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
    assertEquals(
      await pathExists(join(stagingDir, "ssg", "index.html")),
      false,
    );
  } finally {
    await Deno.remove(cwd, { recursive: true });
  }
});

async function createTargetBuildFixture(
  source: string,
  options: {
    appSource?: string;
    files?: Record<string, string>;
  } = {},
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
    options.appSource ??
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
  for (const [relativePath, fileSource] of Object.entries(options.files ?? {})) {
    const absolutePath = join(siteDir, relativePath);
    await Deno.mkdir(dirname(absolutePath), { recursive: true });
    await Deno.writeTextFile(absolutePath, fileSource);
  }

  return { cwd, relativeConfigPath };
}

async function copyDirectoryContents(
  sourceDir: string,
  destinationDir: string,
): Promise<void> {
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
