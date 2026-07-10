export {
  createMainzGeneratedVitePlugins,
} from "../build/vite-plugin-factory.ts";
export type {
  MainzGeneratedVitePluginsOptions,
} from "../build/vite-plugin-factory.ts";
import {
  MAINZ_DENO_VITE_PLUGIN_NPM_SPECIFIER,
} from "../tooling/dependency-versions.ts";
import { defineConfig } from "npm:vite@8.0.16";
import typescript from "npm:typescript@5.9.3";

export { defineConfig, typescript };

export async function loadDenoVitePluginFactory() {
  const module = await import(MAINZ_DENO_VITE_PLUGIN_NPM_SPECIFIER);
  return module.default;
}
