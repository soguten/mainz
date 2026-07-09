/// <reference lib="deno.ns" />

import { join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { loadConfigFromFile, resolveConfig } from "vite";
import { normalizeMainzConfig } from "../../config/index.ts";
import { MAINZ_PUBLIC_ENTRYPOINTS } from "../../config/public-entrypoints.ts";
import {
  resolveEffectiveNavigationMode,
  resolveTargetBuildProfile,
} from "../profiles.ts";
import {
  renderMaterializedDenoViteRuntimeModule,
  renderMaterializedNodeViteRuntimeModule,
  renderMaterializedViteConfigModule,
  renderGeneratedViteConfigModule,
  resolveMainzBuildModulePath,
  resolveGeneratedViteConfig,
} from "../vite-config.ts";

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
    outputDir: "dist/site",
    navigationMode: "spa",
    basePath: "/",
    appLocales: [],
    localePrefix: "except-default",
  });

  const frameworkAliases = generated.aliases.filter((alias) => alias.framework);
  assertEquals(
    [...frameworkAliases].map((alias) => alias.find).sort(),
    [
      ...MAINZ_PUBLIC_ENTRYPOINTS.map((entrypoint) => entrypoint.specifier),
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ].sort(),
  );
  assertEquals(frameworkAliases.at(-1)?.find, "mainz");
});

Deno.test("build/vite-config: should alias Mainz to package sources instead of consumer project paths", async () => {
  const cwd = await Deno.makeTempDir({
    prefix: "mainz-consumer-vite-aliases-",
  });

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
      outputDir: "dist/site",
      navigationMode: "spa",
      basePath: "/",
      appLocales: [],
      localePrefix: "except-default",
    });

    const frameworkAliases = generated.aliases.filter((alias) => alias.framework);
    assertEquals(
      [...frameworkAliases].map((alias) => alias.find).sort(),
      [
        ...MAINZ_PUBLIC_ENTRYPOINTS.map((entrypoint) => entrypoint.specifier),
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ].sort(),
    );
    for (const alias of frameworkAliases) {
      assertEquals(alias.replacement.startsWith(normalizePath(cwd)), false);
    }
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
    outputDir: "dist/docs",
    navigationMode: "mpa",
    basePath: "/docs/",
    appLocales: ["en", "pt-BR"],
    defaultLocale: "en",
    localePrefix: "always",
    siteUrl: "https://mainz.dev",
    devSsgDebug: true,
  });

  assertEquals(generated.root, normalizePath(resolve(cwd, "docs-site")));
  assertEquals(generated.appType, "mpa");
  assertEquals(generated.base, "/docs/");
  assertEquals(generated.outDir, normalizePath(resolve(cwd, "dist/docs")));
  assertEquals(generated.publicDir, normalizePath(resolve(cwd, "docs-site/public")));
  assertEquals(
    generated.define.__MAINZ_NAVIGATION_MODE__,
    JSON.stringify("mpa"),
  );
  assertEquals(generated.define.__MAINZ_TARGET_NAME__, JSON.stringify("docs"));
  assertEquals(
    generated.define.__MAINZ_APP_LOCALES__,
    JSON.stringify(["en", "pt-BR"]),
  );
  assertEquals(generated.define.__DOCS_VERSION__, JSON.stringify("dev"));
  assertStringIncludes(
    generated.devMiddleware.modulePath,
    "/src/build/dev-vite-plugin.ts",
  );
  assertEquals(generated.devMiddleware.options.debugSsg, true);

  const appAlias = generated.aliases.find((alias) => alias.find === "@docs");
  assert(appAlias);
  assertEquals(
    appAlias.replacement,
    normalizePath(resolve(cwd, "docs-site/src")),
  );
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
    runtimeName: "deno",
    target: config.targets[0],
    outputDir: "dist/site",
    navigationMode: "spa",
    basePath: "/",
    appLocales: [],
    localePrefix: "except-default",
    cacheDir: ".mainz_temp/vite-cache/site",
  });
  const moduleSource = renderGeneratedViteConfigModule(generated);

  assertStringIncludes(
    moduleSource,
    `import { createMainzGeneratedVitePlugins } from `,
  );
  assertStringIncludes(moduleSource, `import ts from "npm:typescript@5.9.3";`);
  assertStringIncludes(
    moduleSource,
    `import deno from "npm:@deno/vite-plugin@2.0.2";`,
  );
  assertStringIncludes(moduleSource, `// @mainz-generated-vite-config`);
  assertStringIncludes(
    moduleSource,
    `import { defineConfig } from "npm:vite@8.0.16";`,
  );
  assertStringIncludes(
    moduleSource,
    `plugins: createMainzGeneratedVitePlugins({`,
  );
  assertStringIncludes(moduleSource, `"runtimeName": "deno"`);
  assertStringIncludes(moduleSource, `"debugSsg": false`);
  assertStringIncludes(moduleSource, `appType: "spa"`);
  assertStringIncludes(moduleSource, `{ find: "mainz", replacement:`);
  assertStringIncludes(
    moduleSource,
    `{ find: "mainz/jsx-runtime", replacement:`,
  );
  assertStringIncludes(
    moduleSource,
    `{ find: "react/jsx-dev-runtime", replacement:`,
  );
  assertStringIncludes(
    moduleSource,
    `"__MAINZ_NAVIGATION_MODE__": "\\"spa\\""`,
  );
  assertStringIncludes(moduleSource, `jsxImportSource: "mainz"`);
  assertStringIncludes(moduleSource, `esbuild: {`);
  assertStringIncludes(moduleSource, `keepNames: true`);
  assertStringIncludes(moduleSource, `awaitWriteFinish: {`);
  assertStringIncludes(moduleSource, `stabilityThreshold: 250`);
  assertStringIncludes(moduleSource, `pollInterval: 25`);
  assertStringIncludes(
    moduleSource,
    `cacheDir: ${
      JSON.stringify(
        normalizePath(resolve(cwd, ".mainz_temp/vite-cache/site")),
      )
    }`,
  );
  assertEquals(moduleSource.includes(`mainz-typescript-decorators`), false);
});

Deno.test("build/vite-config: should resolve Mainz build modules from local file module URLs", () => {
  const resolved = resolveMainzBuildModulePath(
    "./dev-vite-plugin.ts",
    pathToFileURL(join(Deno.cwd(), "src", "build", "vite-config.ts")).href,
  );

  assertStringIncludes(resolved, "/src/build/dev-vite-plugin.ts");
});

Deno.test("build/vite-config: should render remote Mainz build imports for JSR-hosted Deno execution", () => {
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
    runtimeName: "deno",
    mainzModuleUrl:
      "https://jsr.io/@mainz/mainz/0.1.0-alpha.59/src/build/vite-config.ts",
    target: config.targets[0],
    outputDir: "dist/site",
    navigationMode: "spa",
    basePath: "/",
    appLocales: [],
    localePrefix: "except-default",
  });
  const moduleSource = renderGeneratedViteConfigModule(generated);

  assertEquals(
    generated.devMiddleware.modulePath,
    "https://jsr.io/@mainz/mainz/0.1.0-alpha.59/src/build/dev-vite-plugin.ts",
  );
  assertEquals(
    generated.aliases.find((alias) => alias.find === "mainz")?.replacement,
    "jsr:@mainz/mainz@0.1.0-alpha.59",
  );
  assertEquals(
    generated.aliases.find((alias) => alias.find === "react/jsx-dev-runtime")
      ?.replacement,
    "jsr:@mainz/mainz@0.1.0-alpha.59/jsx-dev-runtime",
  );
  assertStringIncludes(
    moduleSource,
    'import { createMainzGeneratedVitePlugins } from "https://jsr.io/@mainz/mainz/0.1.0-alpha.59/src/build/vite-plugin-factory.ts";',
  );
});

Deno.test("build/vite-config: should render a Node Vite config module without the Deno plugin", () => {
  const cwd = Deno.makeTempDirSync({ prefix: "mainz-node-vite-config-" });

  try {
    const config = normalizeMainzConfig({
      runtime: "node",
      targets: [
        {
          name: "site",
          rootDir: "./site",
        },
      ],
    });

    const generated = resolveGeneratedViteConfig({
      cwd,
      runtimeName: "node",
      target: config.targets[0],
      outputDir: "dist/site",
      navigationMode: "spa",
      basePath: "/",
      appLocales: [],
      localePrefix: "except-default",
      cacheDir: ".mainz_temp/vite-cache/site",
    });
    const moduleSource = renderGeneratedViteConfigModule(generated, "node");

    assertStringIncludes(
      moduleSource,
      `import { defineConfig } from "mainz/tooling/vite";`,
    );
    assertStringIncludes(
      moduleSource,
      `import { createMainzGeneratedVitePlugins } from `,
    );
    assertStringIncludes(
      moduleSource,
      `plugins: createMainzGeneratedVitePlugins({`,
    );
    assertStringIncludes(moduleSource, `"runtimeName": "node"`);
    assertStringIncludes(moduleSource, `"debugSsg": false`);
    assertStringIncludes(moduleSource, `appType: "spa"`);
    assertStringIncludes(
      moduleSource,
      `cacheDir: ${
        JSON.stringify(
          normalizePath(resolve(cwd, ".mainz_temp/vite-cache/site")),
        )
      }`,
    );
    assertStringIncludes(
      moduleSource,
      `"__MAINZ_NAVIGATION_MODE__": "\\"spa\\""`,
    );
  } finally {
    Deno.removeSync(cwd, { recursive: true });
  }
});

Deno.test("build/vite-config: should render a materialized Vite config with relative workspace paths", () => {
  const cwd = Deno.makeTempDirSync({
    prefix: "mainz-materialized-vite-config-",
  });

  try {
    const config = normalizeMainzConfig({
      runtime: "deno",
      targets: [
        {
          name: "site",
          rootDir: "./site",
          vite: {
            alias: {
              "@content": "./site/src/content",
            },
          },
        },
      ],
    });

    const generated = resolveGeneratedViteConfig({
      cwd,
      runtimeName: "deno",
      target: config.targets[0],
      outputDir: "dist/site/browser",
      navigationMode: "spa",
      basePath: "/",
      appLocales: [],
      localePrefix: "except-default",
      cacheDir: ".mainz_temp/vite-cache/site",
    });
    const moduleSource = renderMaterializedViteConfigModule(generated);

    assertStringIncludes(
      moduleSource,
      'import { createMainzGeneratedVitePlugins, defineConfig, deno, ts } from "./.mainz/vite-runtime.ts";',
    );
    assertStringIncludes(moduleSource, `root: "./site"`);
    assertStringIncludes(moduleSource, `publicDir: "./public"`);
    assertStringIncludes(moduleSource, `cacheDir: "../.mainz_temp/vite-cache/site"`);
    assertStringIncludes(moduleSource, `outDir: "../dist/site/browser"`);
    assertStringIncludes(moduleSource, `"cwd": ".."`);
    assertStringIncludes(
      moduleSource,
      '{ find: "@content", replacement: "./src/content" }',
    );
    assertEquals(moduleSource.includes(normalizePath(cwd)), false);
  } finally {
    Deno.removeSync(cwd, { recursive: true });
  }
});

Deno.test("build/vite-config: materialized Vite config should resolve app root from the project cwd in Vite", async () => {
  const cwd = await Deno.makeTempDir({
    prefix: "mainz-materialized-vite-resolve-",
  });
  const previousCwd = process.cwd();

  try {
    const config = normalizeMainzConfig({
      runtime: "deno",
      targets: [
        {
          name: "site",
          rootDir: "./site",
        },
      ],
    });

    const generated = resolveGeneratedViteConfig({
      cwd,
      runtimeName: "deno",
      target: config.targets[0],
      outputDir: "dist/site/browser",
      navigationMode: "spa",
      basePath: "/",
      appLocales: [],
      localePrefix: "except-default",
      cacheDir: ".mainz_temp/vite-cache/site",
    });
    const siteDir = join(cwd, "site");
    const configPath = join(siteDir, "vite.config.ts");
    const moduleSource = renderMaterializedViteConfigModule(generated)
      .replaceAll(
        'import { createMainzGeneratedVitePlugins, defineConfig, deno, ts } from "./.mainz/vite-runtime.ts";\n',
        "const defineConfig = (config) => config;\n",
      )
      .replace(
        /    plugins: createMainzGeneratedVitePlugins\(\{[\s\S]*?    \}\),\n/,
        "    plugins: [],\n",
      );
    await Deno.mkdir(siteDir, { recursive: true });
    await Deno.writeTextFile(
      configPath,
      moduleSource,
    );

    process.chdir(cwd);
    const loaded = await loadConfigFromFile(
      {
        command: "serve",
        mode: "development",
      },
      configPath,
      cwd,
    );
    const resolved = await resolveConfig(
      {
        ...(loaded?.config ?? {}),
      },
      "serve",
      "development",
    );

    assertEquals(resolved.root, normalizePath(resolve(cwd, "site")));
    assertEquals(resolved.publicDir, normalizePath(resolve(cwd, "site/public")));
  } finally {
    process.chdir(previousCwd);
    await Deno.remove(cwd, { recursive: true });
  }
});

Deno.test("build/vite-config: should render a managed Deno runtime helper for materialized configs", () => {
  const helperSource = renderMaterializedDenoViteRuntimeModule();

  assertStringIncludes(helperSource, 'import deno from "npm:@deno/vite-plugin@2.0.2";');
  assertStringIncludes(
    helperSource,
    "import { createMainzGeneratedVitePlugins } from ",
  );
  assertStringIncludes(helperSource, "vite-plugin-factory.ts");
  assertStringIncludes(helperSource, 'import ts from "npm:typescript@5.9.3";');
  assertStringIncludes(
    helperSource,
    'import { defineConfig } from "npm:vite@8.0.16";',
  );
  assertStringIncludes(
    helperSource,
    "export { createMainzGeneratedVitePlugins, defineConfig, deno, ts };",
  );
});

Deno.test("build/vite-config: should render a managed Node runtime helper for materialized configs", () => {
  const helperSource = renderMaterializedNodeViteRuntimeModule();

  assertStringIncludes(
    helperSource,
    "import { createMainzGeneratedVitePlugins } from ",
  );
  assertStringIncludes(helperSource, "vite-plugin-factory.ts");
  assertStringIncludes(
    helperSource,
    'import { defineConfig } from "mainz/tooling/vite";',
  );
  assertEquals(helperSource.includes('from "mainz/tooling/build"'), false);
  assertEquals(helperSource.includes("@deno/vite-plugin"), false);
  assertEquals(helperSource.includes('import ts from "typescript";'), false);
  assertStringIncludes(
    helperSource,
    "export { createMainzGeneratedVitePlugins, defineConfig };",
  );
});

Deno.test("build/vite-config: should render an SSR server bundle config", () => {
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
    outputDir: "dist/site/server",
    navigationMode: "spa",
    basePath: "/",
    appLocales: ["en"],
    defaultLocale: "en",
    localePrefix: "except-default",
    buildTarget: "server",
    serverBundle: {
      entryPath: "./site/src/main.tsx",
      outputFileName: "app.mjs",
    },
  });
  const moduleSource = renderGeneratedViteConfigModule(generated);

  assertEquals(generated.appType, "custom");
  assertEquals(generated.buildTarget, "server");
  assertEquals(
    generated.serverBundle?.entryPath,
    normalizePath(resolve(cwd, "site/src/main.tsx")),
  );
  assertStringIncludes(moduleSource, `publicDir: false`);
  assertStringIncludes(
    moduleSource,
    `ssr: ${JSON.stringify(normalizePath(resolve(cwd, "site/src/main.tsx")))}`,
  );
  assertStringIncludes(moduleSource, `entryFileNames: "app.mjs"`);
  assertStringIncludes(moduleSource, `format: "es"`);
});


Deno.test("build/vite-config: should use app-owned navigation for generated defaults", async () => {
  const fixture = await createAppFixture({
    navigation: "mpa",
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
    const profile = await resolveTargetBuildProfile(
      config.targets[0],
      undefined,
      fixture.cwd,
    );
    const navigationMode = await resolveEffectiveNavigationMode(
      config.targets[0],
      profile,
      fixture.cwd,
    );
    const generated = resolveGeneratedViteConfig({
      cwd: fixture.cwd,
      target: config.targets[0],
      outputDir: "dist/site",
      navigationMode,
      basePath: "./",
      appLocales: [],
      localePrefix: "except-default",
    });

    assertEquals(navigationMode, "mpa");
    assertEquals(generated.appType, "mpa");
    assertEquals(
      generated.define.__MAINZ_NAVIGATION_MODE__,
      JSON.stringify("mpa"),
    );
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
    const profile = await resolveTargetBuildProfile(
      config.targets[0],
      undefined,
      fixture.cwd,
    );
    const navigationMode = await resolveEffectiveNavigationMode(
      config.targets[0],
      profile,
      fixture.cwd,
    );
    const generated = resolveGeneratedViteConfig({
      cwd: fixture.cwd,
      target: config.targets[0],
      outputDir: "dist/site",
      navigationMode,
      basePath: "/",
      appLocales: [],
      localePrefix: "except-default",
    });

    assertEquals(navigationMode, "spa");
    assertEquals(generated.appType, "spa");
    assertEquals(
      generated.define.__MAINZ_NAVIGATION_MODE__,
      JSON.stringify("spa"),
    );
  } finally {
    await Deno.remove(fixture.cwd, { recursive: true });
  }
});

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}

async function createAppFixture(args: {
  navigation?: "spa" | "mpa";
}): Promise<{ cwd: string }> {
  const cwd = await Deno.makeTempDir({
    prefix: "mainz-generated-vite-navigation-",
  });
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
      ...(args.navigation
        ? [`  navigation: ${JSON.stringify(args.navigation)},`]
        : []),
      "  pages: [],",
      "});",
      "",
    ].join("\n"),
  );

  return { cwd };
}
