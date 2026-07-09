import { existsSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { NormalizedMainzTarget } from "../config/index.ts";
import { MAINZ_PUBLIC_ENTRYPOINTS } from "../config/public-entrypoints.ts";
import type { NavigationMode } from "../routing/index.ts";
import {
  MAINZ_DENO_VITE_PLUGIN_NPM_SPECIFIER,
  MAINZ_TYPESCRIPT_NPM_SPECIFIER,
  MAINZ_VITE_NPM_SPECIFIER,
} from "../tooling/dependency-versions.ts";
import type { ToolingRuntimeName } from "../tooling/runtime/index.ts";

export interface GeneratedViteAlias {
  find: string;
  replacement: string;
  framework: boolean;
}

export interface GeneratedViteConfigInput {
  cwd: string;
  runtimeName?: ToolingRuntimeName;
  target: NormalizedMainzTarget;
  outputDir: string;
  navigationMode: NavigationMode;
  basePath: string;
  appLocales: readonly string[];
  defaultLocale?: string;
  localePrefix: "except-default" | "always";
  siteUrl?: string;
  devSsgDebug?: boolean;
  cacheDir?: string;
  buildTarget?: "browser" | "server";
  serverBundle?: {
    entryPath: string;
    outputFileName?: string;
  };
  mainzModuleUrl?: string;
}

export interface GeneratedViteConfig {
  root: string;
  base: string;
  appType: "spa" | "mpa" | "custom";
  outDir: string;
  publicDir?: string | false;
  cacheDir?: string;
  aliases: readonly GeneratedViteAlias[];
  define: Record<string, string>;
  buildTarget: "browser" | "server";
  serverBundle?: {
    entryPath: string;
    outputFileName?: string;
  };
  devMiddleware: {
    modulePath: string;
    options: Record<string, unknown>;
  };
}

export function resolveGeneratedViteConfig(
  input: GeneratedViteConfigInput,
): GeneratedViteConfig {
  const buildTarget = input.buildTarget ?? "browser";
  const runtimeName = input.runtimeName ?? "deno";

  return {
    root: normalizePathSlashes(resolve(input.cwd, input.target.rootDir)),
    base: input.basePath,
    appType: buildTarget === "server"
      ? "custom"
      : input.navigationMode === "spa"
      ? "spa"
      : "mpa",
    outDir: normalizePathSlashes(resolve(input.cwd, input.outputDir)),
    publicDir: resolveGeneratedPublicDir(input, buildTarget),
    cacheDir: input.cacheDir
      ? normalizePathSlashes(resolve(input.cwd, input.cacheDir))
      : undefined,
    aliases: [
      ...resolveFrameworkAliases(input.mainzModuleUrl ?? import.meta.url),
      ...resolveTargetAliases(input.cwd, input.target),
    ],
    define: {
      __MAINZ_NAVIGATION_MODE__: JSON.stringify(input.navigationMode),
      __MAINZ_TARGET_NAME__: JSON.stringify(input.target.name),
      __MAINZ_BASE_PATH__: JSON.stringify(input.basePath),
      __MAINZ_APP_LOCALES__: JSON.stringify(input.appLocales),
      __MAINZ_DEFAULT_LOCALE__: JSON.stringify(input.defaultLocale),
      __MAINZ_LOCALE_PREFIX__: JSON.stringify(input.localePrefix),
      __MAINZ_SITE_URL__: JSON.stringify(input.siteUrl),
      ...input.target.vite?.define,
    },
    buildTarget,
    serverBundle: input.serverBundle
      ? {
        entryPath: normalizePathSlashes(
          resolve(input.cwd, input.serverBundle.entryPath),
        ),
        outputFileName: input.serverBundle.outputFileName,
      }
      : undefined,
    devMiddleware: {
      modulePath: resolveMainzBuildModulePath(
        "./dev-vite-plugin.ts",
        input.mainzModuleUrl,
      ),
      options: {
        cwd: normalizePathSlashes(input.cwd),
        runtimeName,
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
  return renderViteConfigModule(
    relativizeMaterializedViteConfig(config),
    runtime,
    "materialized",
  );
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

  const imports = mode === "materialized"
    ? [
      `import { createMainzGeneratedVitePlugins } from ${
        JSON.stringify(
          resolveMaterializedVitePluginImportSpecifier(
            config.devMiddleware.modulePath,
            runtime,
          ),
        )
      };`,
      `import { defineConfig } from ${
        JSON.stringify(resolveGeneratedViteImportSpecifier("vite", runtime, mode))
      };`,
    ]
    : [
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
            "typescript",
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

  if (config.buildTarget === "server") {
    configLines.push(`    publicDir: false,`);
  } else if (typeof config.publicDir === "string") {
    configLines.push(`    publicDir: ${JSON.stringify(config.publicDir)},`);
  }

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
    ...(config.serverBundle
      ? [
        `        ssr: ${JSON.stringify(config.serverBundle.entryPath)},`,
        `        rollupOptions: {`,
        `            output: {`,
        `                entryFileNames: ${
          JSON.stringify(config.serverBundle.outputFileName ?? "app.mjs")
        },`,
        `                format: "es",`,
        `            },`,
        `        },`,
      ]
      : []),
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

function resolveFrameworkAliases(mainzModuleUrl: string): GeneratedViteAlias[] {
  const publicAliases = MAINZ_PUBLIC_ENTRYPOINTS
    .map((entrypoint) => {
      const replacement = resolveFrameworkEntrypointReplacement(
        entrypoint.specifier,
        entrypoint.sourcePath,
        mainzModuleUrl,
      );
      return replacement
        ? {
          find: entrypoint.specifier,
          replacement,
          framework: true,
        }
        : undefined;
    })
    .filter((alias): alias is GeneratedViteAlias => alias !== undefined);
  // Vite's dev dependency scan may look for React's automatic JSX runtime names
  // even though Mainz provides the actual implementation.
  const compatAliases = [
    {
      find: "react/jsx-runtime",
      replacement: resolveFrameworkEntrypointReplacement(
        "mainz/jsx-runtime",
        "src/jsx-runtime.ts",
        mainzModuleUrl,
      ),
    },
    {
      find: "react/jsx-dev-runtime",
      replacement: resolveFrameworkEntrypointReplacement(
        "mainz/jsx-dev-runtime",
        "src/jsx-dev-runtime.ts",
        mainzModuleUrl,
      ),
    },
  ]
    .filter((alias): alias is { find: string; replacement: string } =>
      typeof alias.replacement === "string"
    )
    .map((alias) => ({
      ...alias,
      framework: true,
    }));

  return [...publicAliases, ...compatAliases]
    .sort((a, b) => b.find.length - a.find.length);
}

function resolveFrameworkEntrypointReplacement(
  specifier: string,
  sourcePath: string,
  mainzModuleUrl: string,
): string | undefined {
  const publishedSpecifier = resolvePublishedMainzPackageSpecifier(
    mainzModuleUrl,
  );
  if (publishedSpecifier) {
    return specifier === "mainz"
      ? publishedSpecifier
      : `${publishedSpecifier}/${specifier.slice("mainz/".length)}`;
  }

  let moduleUrl: URL;
  try {
    moduleUrl = new URL(mainzModuleUrl);
  } catch {
    return undefined;
  }

  if (moduleUrl.protocol !== "file:") {
    return undefined;
  }

  const packageRoot = resolve(dirname(fileURLToPath(moduleUrl)), "..", "..");
  const replacement = normalizePathSlashes(resolve(packageRoot, sourcePath));
  return existsSync(replacement) ? replacement : undefined;
}

function resolvePublishedMainzPackageSpecifier(
  moduleUrl: string,
): string | undefined {
  let url: URL;
  try {
    url = new URL(moduleUrl);
  } catch {
    return undefined;
  }

  if (url.protocol !== "https:" || url.hostname !== "jsr.io") {
    return undefined;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] !== "@mainz" || !segments[1]?.startsWith("mainz")) {
    return undefined;
  }

  return segments[2] ? `jsr:@mainz/mainz@${segments[2]}` : undefined;
}

function resolveGeneratedPublicDir(
  input: GeneratedViteConfigInput,
  buildTarget: "browser" | "server",
): string | false | undefined {
  if (buildTarget === "server") {
    return false;
  }

  return normalizePathSlashes(
    resolve(input.cwd, input.target.rootDir, "public"),
  );
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

function relativizeMaterializedViteConfig(
  config: GeneratedViteConfig,
): GeneratedViteConfig {
  const configDir = config.root;
  const projectCwd = resolveMaterializedProjectCwd(config);

  return {
    ...config,
    root: projectCwd
      ? relativizeMaterializedFileSystemPath(config.root, projectCwd)
      : ".",
    outDir: relativizeMaterializedFileSystemPath(config.outDir, configDir),
    publicDir: typeof config.publicDir === "string"
      ? relativizeMaterializedFileSystemPath(config.publicDir, configDir)
      : config.publicDir,
    cacheDir: config.cacheDir
      ? relativizeMaterializedFileSystemPath(config.cacheDir, configDir)
      : undefined,
    aliases: config.aliases.map((alias) =>
      alias.framework || !isAbsoluteFileSystemPath(alias.replacement)
        ? alias
        : {
          ...alias,
          replacement: relativizeMaterializedFileSystemPath(
            alias.replacement,
            configDir,
          ),
        }
    ),
    serverBundle: config.serverBundle
      ? {
        ...config.serverBundle,
        entryPath: relativizeMaterializedFileSystemPath(
          config.serverBundle.entryPath,
          configDir,
        ),
      }
      : undefined,
    devMiddleware: {
      ...config.devMiddleware,
      options: relativizeMaterializedDevMiddlewareOptions(
        config.devMiddleware.options,
        configDir,
      ),
    },
  };
}

function relativizeMaterializedDevMiddlewareOptions(
  options: Record<string, unknown>,
  configDir: string,
): Record<string, unknown> {
  const cwd = options.cwd;
  if (typeof cwd !== "string" || !isAbsoluteFileSystemPath(cwd)) {
    return options;
  }

  return {
    ...options,
    cwd: relativizeMaterializedFileSystemPath(cwd, configDir),
  };
}

function resolveMaterializedProjectCwd(
  config: GeneratedViteConfig,
): string | undefined {
  const cwd = config.devMiddleware.options.cwd;
  return typeof cwd === "string" && isAbsoluteFileSystemPath(cwd)
    ? cwd
    : undefined;
}

function relativizeMaterializedFileSystemPath(
  path: string,
  configDir: string,
): string {
  const relativePath = normalizePathSlashes(relative(configDir, path));
  if (!relativePath || relativePath === ".") {
    return ".";
  }

  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

function isAbsoluteFileSystemPath(value: string): boolean {
  return !isAbsoluteImportUrl(value) &&
    (isAbsolute(value) || value.startsWith("/") || value.startsWith("\\"));
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

export function resolveMainzBuildModulePath(
  relativePath: string,
  moduleUrl: string = import.meta.url,
): string {
  const resolvedUrl = new URL(relativePath, moduleUrl);
  if (resolvedUrl.protocol === "file:") {
    return normalizePathSlashes(fileURLToPath(resolvedUrl));
  }

  return resolvedUrl.href;
}

function resolveGeneratedViteImportSpecifier(
  specifier: "vite" | "@deno/vite-plugin" | "typescript",
  runtime: ToolingRuntimeName,
  mode: "generated" | "materialized" = "generated",
): string {
  if (runtime === "deno") {
    return resolvePublishedGeneratedDenoImportSpecifier(specifier);
  }

  if (runtime === "node" && specifier === "vite") {
    return "mainz/tooling/vite";
  }

  return specifier;
}

function resolveGeneratedModuleImportSpecifier(
  path: string,
  runtime: ToolingRuntimeName,
): string {
  if (runtime === "deno") {
    if (isAbsoluteImportUrl(path)) {
      return path;
    }

    return pathToFileURL(path).href;
  }

  return path;
}

function isAbsoluteImportUrl(value: string): boolean {
  if (/^[A-Za-z]:[\\/]/.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol.length > 0;
  } catch {
    return false;
  }
}

function resolvePublishedGeneratedDenoImportSpecifier(
  specifier: "vite" | "@deno/vite-plugin" | "typescript",
): string {
  switch (specifier) {
    case "vite":
      return MAINZ_VITE_NPM_SPECIFIER;
    case "@deno/vite-plugin":
      return MAINZ_DENO_VITE_PLUGIN_NPM_SPECIFIER;
    case "typescript":
      return MAINZ_TYPESCRIPT_NPM_SPECIFIER;
  }
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

function resolveMaterializedVitePluginImportSpecifier(
  modulePath: string,
  runtime: ToolingRuntimeName,
): string {
  if (runtime === "node") {
    const publishedSpecifier = resolvePublishedMainzPackageSpecifier(modulePath);
    if (publishedSpecifier) {
      return "mainz/tooling/vite-build";
    }
  }

  return resolveGeneratedModuleImportSpecifier(
    resolveMainzPublicEntrypointSourcePath(
      modulePath,
      "src/public/tooling-vite-build.ts",
    ),
    runtime,
  );
}

function resolveMainzPublicEntrypointSourcePath(
  modulePath: string,
  sourcePath: string,
): string {
  const publishedSpecifier = resolvePublishedMainzPackageSpecifier(modulePath);
  if (publishedSpecifier) {
    return `https://jsr.io/@mainz/mainz/${
      publishedSpecifier.slice("jsr:@mainz/mainz@".length)
    }/${sourcePath}`;
  }

  let url: URL | undefined;
  try {
    url = new URL(modulePath);
  } catch {
    url = undefined;
  }

  if (url?.protocol === "file:") {
    const packageRoot = resolve(dirname(fileURLToPath(url)), "..", "..");
    return normalizePathSlashes(resolve(packageRoot, sourcePath));
  }

  if (isAbsolute(modulePath)) {
    const packageRoot = resolve(dirname(modulePath), "..", "..");
    return normalizePathSlashes(resolve(packageRoot, sourcePath));
  }

  return sourcePath;
}
