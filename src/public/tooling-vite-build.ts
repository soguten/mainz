export {
  createMainzGeneratedVitePlugins,
} from "../build/vite-plugin-factory.ts";
export type {
  MainzGeneratedVitePluginsOptions,
} from "../build/vite-plugin-factory.ts";
export { defineConfig } from "vite";
export { default as typescript } from "typescript";

export async function loadDenoVitePluginFactory() {
  const specifier = "@deno/" + "vite-plugin";
  const module = await import(specifier);
  return module.default;
}
