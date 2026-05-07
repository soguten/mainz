import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { createMainzDevRouteMiddlewarePlugin } from "./dev-vite-plugin.ts";

interface GeneratedViteTypescriptApi {
  transpileModule(
    code: string,
    options: {
      fileName: string;
      compilerOptions: {
        target: unknown;
        module: unknown;
        jsx?: unknown;
        experimentalDecorators: boolean;
        useDefineForClassFields: boolean;
        sourceMap: boolean;
      };
    },
  ): {
    outputText: string;
    sourceMapText?: string;
  };
  ScriptTarget: {
    ES2022: unknown;
  };
  ModuleKind: {
    ESNext: unknown;
  };
  JsxEmit: {
    Preserve: unknown;
  };
}

export interface MainzGeneratedVitePluginsOptions {
  runtimeName: "deno" | "node" | "bun";
  devMiddlewareOptions: Parameters<
    typeof createMainzDevRouteMiddlewarePlugin
  >[0];
  denoPluginFactory?: (options: {
    workspaceOptions: {
      noLock: boolean;
      platform: "browser";
      preserveJsx: boolean;
    };
  }) => Plugin | Plugin[];
  typescript?: GeneratedViteTypescriptApi;
}

export function createMainzGeneratedVitePlugins(
  options: MainzGeneratedVitePluginsOptions,
): Plugin[] {
  const plugins: Plugin[] = [];

  if (options.runtimeName === "deno") {
    if (!options.denoPluginFactory || !options.typescript) {
      throw new Error(
        'Mainz generated Vite config requires denoPluginFactory and typescript when runtimeName is "deno".',
      );
    }

    plugins.push(createMainzTypescriptDecoratorsPlugin(options.typescript));
    const denoPlugin = options.denoPluginFactory({
      workspaceOptions: {
        noLock: true,
        platform: "browser",
        preserveJsx: true,
      },
    });
    plugins.push(...toPluginArray(denoPlugin));
  }

  plugins.push(
    createMainzDevRouteMiddlewarePlugin(options.devMiddlewareOptions),
  );
  return plugins;
}

function createMainzTypescriptDecoratorsPlugin(
  typescript: GeneratedViteTypescriptApi,
): Plugin {
  let resolvedRoot = "";

  return {
    name: "mainz-typescript-decorators",
    enforce: "pre",
    configResolved(resolvedConfig) {
      resolvedRoot = resolvedConfig.root.replaceAll("\\", "/");
    },
    transform(code, id) {
      const normalizedId = normalizeGeneratedTsTransformId(id);
      if (!normalizedId) {
        return null;
      }
      if (
        !/\.(?:ts|tsx|mts|cts)$/i.test(normalizedId) ||
        /\.d\.ts$/i.test(normalizedId)
      ) {
        return null;
      }
      if (
        normalizedId.includes("/node_modules/") ||
        normalizedId.includes("/.mainz/") ||
        normalizedId.includes("/.mainz-temp/vite-configs/") ||
        normalizedId.includes("/.mainz-temp/vite-cache/") ||
        normalizedId.includes("/.mainz_temp/vite-configs/") ||
        normalizedId.includes("/.mainz_temp/vite-cache/")
      ) {
        return null;
      }
      if (
        resolvedRoot &&
        !normalizedId.startsWith(resolvedRoot + "/") &&
        normalizedId !== resolvedRoot
      ) {
        return null;
      }

      const isTsx = /\.tsx$/i.test(normalizedId);
      const transpiled = typescript.transpileModule(code, {
        fileName: normalizedId,
        compilerOptions: {
          target: typescript.ScriptTarget.ES2022,
          module: typescript.ModuleKind.ESNext,
          jsx: isTsx ? typescript.JsxEmit.Preserve : undefined,
          experimentalDecorators: true,
          useDefineForClassFields: false,
          sourceMap: true,
        },
      });

      return {
        code: transpiled.outputText.replace(/\/\/# sourceMappingURL=.*$/m, ""),
        map: transpiled.sourceMapText ?? null,
      };
    },
  };
}

function normalizeGeneratedTsTransformId(id: string): string | undefined {
  const [rawId] = id.split("?", 1);
  if (!rawId) {
    return undefined;
  }

  if (rawId.startsWith("file://")) {
    return fileURLToPath(rawId).replaceAll("\\", "/");
  }

  return rawId.replaceAll("\\", "/");
}

function toPluginArray(pluginOption: Plugin | Plugin[]): Plugin[] {
  return Array.isArray(pluginOption) ? pluginOption : [pluginOption];
}
