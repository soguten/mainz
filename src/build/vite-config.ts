import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { NormalizedMainzTarget } from "../config/index.ts";
import { MAINZ_PUBLIC_ENTRYPOINTS } from "../config/public-entrypoints.ts";
import type { NavigationMode, RenderMode } from "../routing/index.ts";
import type { ToolingRuntimeName } from "../tooling/runtime/index.ts";

export interface GeneratedViteAlias {
  find: string;
  replacement: string;
  framework: boolean;
}

export interface GeneratedViteConfigInput {
  cwd: string;
  target: NormalizedMainzTarget;
  modeOutDir: string;
  renderMode: RenderMode;
  navigationMode: NavigationMode;
  basePath: string;
  appLocales: readonly string[];
  defaultLocale?: string;
  localePrefix: "except-default" | "always";
  siteUrl?: string;
  devSsgDebug?: boolean;
  cacheDir?: string;
}

export interface GeneratedViteConfig {
  root: string;
  base: string;
  appType: "spa" | "mpa";
  outDir: string;
  cacheDir?: string;
  aliases: readonly GeneratedViteAlias[];
  define: Record<string, string>;
  devMiddleware: {
    modulePath: string;
    options: Record<string, unknown>;
  };
}

export function resolveGeneratedViteConfig(
  input: GeneratedViteConfigInput,
): GeneratedViteConfig {
  return {
    root: normalizePathSlashes(resolve(input.cwd, input.target.rootDir)),
    base: input.basePath,
    appType: input.navigationMode === "spa" ? "spa" : "mpa",
    outDir: normalizePathSlashes(resolve(input.cwd, input.modeOutDir)),
    cacheDir: input.cacheDir
      ? normalizePathSlashes(resolve(input.cwd, input.cacheDir))
      : undefined,
    aliases: [
      ...resolveFrameworkAliases(input.cwd),
      ...resolveTargetAliases(input.cwd, input.target),
    ],
    define: {
      __MAINZ_RENDER_MODE__: JSON.stringify(input.renderMode),
      __MAINZ_NAVIGATION_MODE__: JSON.stringify(input.navigationMode),
      __MAINZ_TARGET_NAME__: JSON.stringify(input.target.name),
      __MAINZ_BASE_PATH__: JSON.stringify(input.basePath),
      __MAINZ_APP_LOCALES__: JSON.stringify(input.appLocales),
      __MAINZ_DEFAULT_LOCALE__: JSON.stringify(input.defaultLocale),
      __MAINZ_LOCALE_PREFIX__: JSON.stringify(input.localePrefix),
      __MAINZ_SITE_URL__: JSON.stringify(input.siteUrl),
      ...input.target.vite?.define,
    },
    devMiddleware: {
      modulePath: resolveMainzBuildModulePath("./dev-vite-plugin.ts"),
      options: {
        cwd: normalizePathSlashes(input.cwd),
        runtimeName: input.cacheDir ? "node" : "deno",
        target: {
          name: input.target.name,
          rootDir: input.target.rootDir,
          appFile: input.target.appFile,
          appId: input.target.appId,
          outDir: input.target.outDir,
          viteConfig: input.target.viteConfig,
        },
        profile: {
          name: "development",
          basePath: input.basePath,
          siteUrl: input.siteUrl,
        },
        debugSsg: input.devSsgDebug === true,
        defaultLocale: input.defaultLocale,
        localePrefix: input.localePrefix,
      },
    },
  };
}

export function renderGeneratedViteConfigModule(
  config: GeneratedViteConfig,
  runtime: ToolingRuntimeName = "deno",
): string {
  return [
    "// @mainz-generated-vite-config",
    renderViteConfigModule(config, runtime, "generated"),
  ].join("\n");
}

export function renderMaterializedViteConfigModule(
  config: GeneratedViteConfig,
  runtime: ToolingRuntimeName = "deno",
): string {
  return renderViteConfigModule(config, runtime, "materialized");
}

function renderViteConfigModule(
  config: GeneratedViteConfig,
  runtime: ToolingRuntimeName,
  mode: "generated" | "materialized",
): string {
  const aliases = config.aliases.map((alias) => {
    return `{ find: ${JSON.stringify(alias.find)}, replacement: ${
      JSON.stringify(alias.replacement)
    } }`;
  });

  const imports = [
    `import { createMainzGeneratedVitePlugins } from ${
      JSON.stringify(
        resolveVitePluginImportSpecifier(
          config.devMiddleware.modulePath,
          runtime,
          mode,
        ),
      )
    };`,
    `import { defineConfig } from ${
      JSON.stringify(resolveGeneratedViteImportSpecifier("vite", runtime, mode))
    };`,
  ];
  const configLines = [
    `export default defineConfig({`,
    `    appType: ${JSON.stringify(config.appType)},`,
    `    base: ${JSON.stringify(config.base)},`,
  ];
  if (config.cacheDir) {
    configLines.push(`    cacheDir: ${JSON.stringify(config.cacheDir)},`);
  }

  if (runtime === "deno") {
    imports.unshift(
      `import deno from ${
        JSON.stringify(
          resolveGeneratedViteImportSpecifier(
            "@deno/vite-plugin",
            runtime,
            mode,
          ),
        )
      };`,
    );
    imports.unshift(
      `import ts from ${
        JSON.stringify(
          resolveGeneratedViteImportSpecifier(
            "npm:typescript@5.9.3",
            runtime,
            mode,
          ),
        )
      };`,
    );
  }

  configLines.push(
    `    plugins: createMainzGeneratedVitePlugins({`,
    `        runtimeName: ${JSON.stringify(runtime)},`,
    ...(runtime === "deno"
      ? [
        `        denoPluginFactory: deno,`,
        `        typescript: ts,`,
      ]
      : []),
    `        devMiddlewareOptions: ${
      renderObjectLiteral(
        config.devMiddleware.options as Record<string, string>,
        12,
      )
    },`,
    `    }),`,
  );

  configLines.push(
    `    resolve: {`,
    `        alias: [`,
    ...aliases.map((alias) => `            ${alias},`),
    `        ],`,
    `    },`,
    `    server: {`,
    `        watch: {`,
    `            awaitWriteFinish: {`,
    `                stabilityThreshold: 250,`,
    `                pollInterval: 25,`,
    `            },`,
    `        },`,
    `    },`,
    `    root: ${JSON.stringify(config.root)},`,
    `    build: {`,
    `        outDir: ${JSON.stringify(config.outDir)},`,
    `        emptyOutDir: true,`,
    ...(runtime === "deno" ? [`        minify: false,`] : []),
    `        sourcemap: true,`,
    `    },`,
    `    define: ${renderObjectLiteral(config.define, 4)},`,
    `    esbuild: {`,
    `        keepNames: true,`,
    `        jsx: "automatic",`,
    `        jsxImportSource: "mainz",`,
    `    },`,
    `});`,
  );

  return [
    ...imports,
    ``,
    ...configLines,
    ``,
  ].join("\n");
}

function resolveFrameworkAliases(cwd: string): GeneratedViteAlias[] {
  return MAINZ_PUBLIC_ENTRYPOINTS
    .map((entrypoint) => ({
      find: entrypoint.specifier,
      replacement: normalizePathSlashes(resolve(cwd, entrypoint.sourcePath)),
      framework: true,
    }))
    .filter((alias) => existsSync(alias.replacement))
    .sort((a, b) => b.find.length - a.find.length);
}

function resolveTargetAliases(
  cwd: string,
  target: NormalizedMainzTarget,
): GeneratedViteAlias[] {
  const alias = target.vite?.alias;
  if (!alias) {
    return [];
  }

  if (Array.isArray(alias)) {
    return alias.map((entry) => ({
      find: entry.find,
      replacement: normalizeAliasReplacement(cwd, entry.replacement),
      framework: false,
    }));
  }

  return Object.entries(alias).map(([find, replacement]) => ({
    find,
    replacement: normalizeAliasReplacement(cwd, replacement),
    framework: false,
  }));
}

function normalizeAliasReplacement(cwd: string, replacement: string): string {
  if (
    replacement.startsWith(".") || replacement.startsWith("/") ||
    replacement.startsWith("\\") || isAbsolute(replacement)
  ) {
    return normalizePathSlashes(resolve(cwd, replacement));
  }

  return replacement;
}

function renderObjectLiteral(
  record: Record<string, unknown>,
  indent: number,
): string {
  const entries = Object.entries(record);
  if (entries.length === 0) {
    return "{}";
  }

  const padding = " ".repeat(indent);
  const entryPadding = " ".repeat(indent + 4);
  return [
    `{`,
    ...entries.map(([key, value]) =>
      `${entryPadding}${JSON.stringify(key)}: ${JSON.stringify(value)},`
    ),
    `${padding}}`,
  ].join("\n");
}

function normalizePathSlashes(path: string): string {
  return path.replaceAll("\\", "/");
}

function resolveMainzBuildModulePath(relativePath: string): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return normalizePathSlashes(resolve(currentDir, relativePath));
}

function resolveGeneratedViteImportSpecifier(
  specifier: "vite" | "@deno/vite-plugin" | "npm:typescript@5.9.3",
  runtime: ToolingRuntimeName,
  mode: "generated" | "materialized" = "generated",
): string {
  if (runtime === "deno" && mode === "generated" && specifier !== "vite") {
    return import.meta.resolve(specifier);
  }

  return specifier;
}

function resolveGeneratedModuleImportSpecifier(
  path: string,
  runtime: ToolingRuntimeName,
): string {
  if (runtime === "deno") {
    return pathToFileURL(path).href;
  }

  return path;
}

function resolveVitePluginImportSpecifier(
  path: string,
  runtime: ToolingRuntimeName,
  mode: "generated" | "materialized",
): string {
  if (mode === "materialized") {
    return "mainz/tooling/build";
  }

  return resolveGeneratedModuleImportSpecifier(
    path.replace("dev-vite-plugin.ts", "vite-plugin-factory.ts"),
    runtime,
  );
}
