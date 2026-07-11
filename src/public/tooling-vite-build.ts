export {
  createMainzGeneratedVitePlugins,
} from "../build/vite-plugin-factory.ts";
export type {
  MainzGeneratedVitePluginsOptions,
} from "../build/vite-plugin-factory.ts";
export {
  applyMaterializedViteNavigationToDefine,
  applyMaterializedViteNavigationToDevMiddlewareOptions,
  resolveMaterializedViteNavigationContext,
} from "../build/materialized-vite-navigation.ts";
import {
  MAINZ_DENO_VITE_PLUGIN_NPM_SPECIFIER,
  MAINZ_TYPESCRIPT_NPM_SPECIFIER,
} from "../tooling/dependency-versions.ts";
import { defineConfig } from "npm:vite@8.0.16";

export { defineConfig };

export async function loadDenoVitePluginFactory() {
  const module = await import(MAINZ_DENO_VITE_PLUGIN_NPM_SPECIFIER);
  return ("default" in module ? module.default : module) as typeof module.default;
}

export async function loadDenoTypescript() {
  const module = await import(MAINZ_TYPESCRIPT_NPM_SPECIFIER);
  return ("default" in module ? module.default : module) as typeof import("typescript");
}
