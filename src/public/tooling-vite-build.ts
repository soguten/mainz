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
import { defineConfig } from "npm:vite@8.0.16";

export { defineConfig };

export async function loadDenoVitePluginFactory() {
  const module = await import("npm:@deno/vite-plugin@2.0.2");
  return ("default" in module ? module.default : module) as typeof module.default;
}

export async function loadDenoTypescript() {
  const module = await import("npm:typescript@5.9.3");
  return ("default" in module ? module.default : module) as typeof import("typescript");
}
